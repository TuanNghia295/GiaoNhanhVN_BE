import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { LockStoreReqDto } from '@/api/stores/dto/lock-store.req.dto';
import { NearbyStoresReqDto } from '@/api/stores/dto/nearby-stores.req.dto';
import { PageStoreManagerReqDto } from '@/api/stores/dto/page-store-manager.req.dto';
import { PageStoreReqDto } from '@/api/stores/dto/page-store.req.dto';
import { QueryListStore } from '@/api/stores/dto/query-list-store.req.dto';
import { SearchPageStoresReqDto } from '@/api/stores/dto/search-page-stores-req.dto';
import { StoreResDto } from '@/api/stores/dto/store.res.dto';
import { UpdateStoreReqDto } from '@/api/stores/dto/update-store.req.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, storeIsOpenSql, Transaction, withPagination } from '@/database/global';
import {
  areas,
  DiscountTypeEnum,
  orders,
  OrderStatusEnum,
  products,
  RoleEnum,
  stores,
  users,
  VouchersStatusEnum,
  VouchersTypeEnum,
} from '@/database/schemas';
import { ratings } from '@/database/schemas/rating.schema';
import { viewedStores } from '@/database/schemas/viewed-stores.schema';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { deleteIfExists, formatDistance, normalizeImagePath } from '@/utils/util';
import {
  HttpStatus,
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  and,
  avg,
  count,
  desc,
  eq,
  exists,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  isNull,
  not,
  or,
  sql,
} from 'drizzle-orm';
import { existsSync, mkdirSync } from 'fs';
import { DateTime } from 'luxon';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StoresService implements OnModuleInit {
  private basePath = `uploads/stores`;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  onModuleInit() {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
      console.log(`Đã tạo thư mục upload: ${this.basePath}`);
    }
  }

  async existById(storeId: number) {
    return await this.db
      .select({
        storeId: stores.id,
        background: stores.background,
        avatar: stores.avatar,
      })
      .from(stores)
      .where(eq(stores.id, storeId))
      .then((res) => res[0] ?? null);
  }

  async existByUserPhone(phone: string) {
    return await this.db
      .select({
        storeId: stores.id,
      })
      .from(stores)
      .leftJoin(users, eq(users.id, stores.userId))
      .where(eq(users.phone, phone))
      .then((res) => res[0] ?? null);
  }

  async existStoreByUserId(userId: number) {
    return await this.db
      .select({
        storeId: stores.id,
        background: stores.background,
        avatar: stores.avatar,
      })
      .from(stores)
      .where(eq(stores.userId, userId))
      .then((res) => res[0] ?? null);
  }

  async getNearestAreaId(latitude: number, longitude: number): Promise<number | null> {
    // Lấy area gần nhất
    const nearestArea = await this.db
      .select({
        id: areas.id,
        distance: sql<number>`
        6371 * acos(
          cos(radians(${latitude})) *
          cos(radians(CAST(split_part(${areas.location}, ',', 1) AS double precision))) *
          cos(radians(CAST(split_part(${areas.location}, ',', 2) AS double precision)) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(CAST(split_part(${areas.location}, ',', 1) AS double precision)))
        )
      `.as('distance'),
      })
      .from(areas)
      .where(isNotNull(areas.location))
      .orderBy(sql`distance ASC`)
      .limit(1);

    return nearestArea.length > 0 ? nearestArea[0].id : null;
  }

  async getPageStores(reqDto: PageStoreReqDto, payload: JwtPayloadType) {
    // Parse latitude and longitude from origins
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);

    //---------------------------------------------------
    // Lấy area gần nhất
    //---------------------------------------------------
    const nearestAreaId = await this.getNearestAreaId(latitude, longitude);
    console.log('nearestAreaId', nearestAreaId);

    const distanceSql = sql.raw(`
    6371 * acos(
      least(
        greatest(
          cos(radians(${latitude})) *
          cos(radians(CAST(split_part(stores.location, ',', 1) AS double precision))) *
          cos(radians(CAST(split_part(stores.location, ',', 2) AS double precision)) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(CAST(split_part(stores.location, ',', 1) AS double precision))),
          -1
        ),
        1
      )
    )
  `);

    // Base query builder
    const baseQb = this.db
      .select({
        ...getTableColumns(stores),
        rating: avg(ratings.storeRate).mapWith(String).as('rating'),
        distance: distanceSql.mapWith(Number).as('distance'),
      })
      .from(stores)
      .leftJoin(ratings, eq(ratings.storeId, stores.id))
      .leftJoin(users, eq(users.id, stores.userId))
      .groupBy(stores.id, users.id)
      .where(
        and(
          ...(reqDto.categoryItemId
            ? [
                exists(
                  this.db
                    .select()
                    .from(products)
                    .where(
                      and(
                        eq(products.storeId, stores.id),
                        eq(products.categoryItemId, reqDto.categoryItemId),
                        isNull(products.deletedAt),
                        eq(products.isLocked, false),
                      ),
                    ),
                ),
              ]
            : []),
          eq(stores.status, true),
          eq(stores.isLocked, false),
          isNotNull(stores.location),
          ...(nearestAreaId ? [eq(stores.areaId, nearestAreaId)] : []),
          // sql`${distanceSql} < 15`,
        ),
      )
      .$dynamic();

    if (reqDto.isBestSeller) {
      baseQb
        .leftJoin(
          orders,
          and(eq(orders.storeId, stores.id), eq(orders.status, OrderStatusEnum.DELIVERED)),
        )
        .groupBy(stores.id)
        .orderBy(
          desc(sql`count
            (
          ${orders.id}
          )`),
          sql`distance
          asc`,
        );
    } else if (reqDto.isRating) {
      baseQb.orderBy(
        sql`rating
        desc`,
        sql`distance
        asc`,
      ).having(sql`avg
        (
      ${ratings.storeRate}
      )
      is
      not
      null`); // thêm sắp xếp khoảng cách
    } else {
      baseQb.orderBy(sql`distance
      asc`);
    }

    withPagination(baseQb, reqDto.limit, reqDto.offset);

    // Execute queries in parallel
    const [entities, { totalCount }] = await Promise.all([
      await baseQb,
      await this.db
        .select({ totalCount: count() })
        .from(stores)
        .leftJoin(users, eq(users.id, stores.userId))
        .where(
          and(
            ...(reqDto.categoryItemId
              ? [
                  exists(
                    this.db
                      .select()
                      .from(products)
                      .where(
                        and(
                          eq(products.storeId, stores.id),
                          eq(products.categoryItemId, reqDto.categoryItemId),
                          isNull(products.deletedAt),
                          eq(products.isLocked, false),
                        ),
                      ),
                  ),
                ]
              : []),
            eq(stores.isLocked, false),
            isNotNull(stores.location),
            ...(nearestAreaId ? [eq(stores.areaId, nearestAreaId)] : []),
          ),
        )
        .then((res) => res[0]),
    ]);
    const entitiesWithDistance = entities.map((e) => ({
      ...e,
      distance: formatDistance(e.distance),
    }));

    // Create pagination metadata and return DTO
    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entitiesWithDistance, meta);
  }

  async getPageStoresByManager(reqDto: PageStoreManagerReqDto, payload: JwtPayloadType) {
    const whereClause = and(
      or(ilike(users.phone, `%${reqDto.q ?? ''}%`), ilike(stores.name, `%${reqDto.q ?? ''}%`)),
      ...(reqDto.areaId ? [eq(stores.areaId, reqDto.areaId)] : []),
      // Quản lý khu vực chỉ xem được các cửa hàng trong khu vực của mình
      ...(payload.role === RoleEnum.MANAGEMENT ? [eq(stores.areaId, payload.areaId)] : []),
    );

    const qb = this.db
      .select({
        ...getTableColumns(stores),
        user: users,
        area: areas,
      })
      .from(stores)
      .leftJoin(areas, eq(areas.id, stores.areaId))
      .leftJoin(users, eq(users.id, stores.userId))
      .where(whereClause)
      .orderBy(desc(stores.createdAt))
      .$dynamic();

    await withPagination(qb, reqDto.limit, reqDto.offset);
    const [entities, { totalCount }] = await Promise.all([
      qb,
      this.db
        .select({ totalCount: count().mapWith(Number) })
        .from(stores)
        .leftJoin(users, eq(users.id, stores.userId))
        .where(whereClause)
        .then((res) => res[0]),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    console.log('meta', meta);
    return new OffsetPaginatedDto(entities, meta);
  }

  async lock(reqDto: LockStoreReqDto) {
    if (!(await this.existById(reqDto.storeId))) {
      throw new ValidationException(ErrorCode.S001, HttpStatus.NOT_FOUND);
    }
    return await this.db
      .update(stores)
      .set({
        ...reqDto,
      })
      .where(eq(stores.id, reqDto.storeId))
      .returning()
      .then((res) => plainToInstance(StoreResDto, res[0]));
  }

  async getStoreById(storeId: number) {
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      with: {
        user: true,
      },
    });
    if (!store) {
      throw new ValidationException(ErrorCode.S001);
    }
    return plainToInstance(StoreResDto, store);
  }

  async update(storeId: number, reqDto: UpdateStoreReqDto) {
    return await this.db.transaction(async (tx) => {
      const [store] = await tx
        .update(stores)
        .set({
          ...reqDto,
        })
        .where(eq(stores.id, storeId))
        .returning();
      return plainToInstance(StoreResDto, store);
    });
  }

  async searchStore(reqDto: SearchPageStoresReqDto) {
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new ValidationException(
        ErrorCode.S007,
        HttpStatus.BAD_REQUEST,
        'Invalid origins format. Expected format: "latitude,longitude"',
      );
    }

    const nearestAreaId = await this.getNearestAreaId(latitude, longitude);

    const escapedQuery = reqDto.q
      ? reqDto.q.replace(/'/g, "''") // Escape single quotes for SQL
      : '';

    // Công thức distance có clamp [-1,1]
    const distanceSql = sql.raw(`
    6371 * acos(
      least(
        greatest(
          cos(radians(${latitude})) *
          cos(radians(CAST(split_part(stores.location, ',', 1) AS double precision))) *
          cos(radians(CAST(split_part(stores.location, ',', 2) AS double precision)) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(CAST(split_part(stores.location, ',', 1) AS double precision))),
          -1
        ),
        1
      )
    )
  `);

    const qb = this.db
      .select({
        ...getTableColumns(stores),
        products: sql`
          (SELECT json_agg(
                    jsonb_build_object(
                      'id', p.id,
                      'name', p.name,
                      'price', p.price,
                      'quantity', p.quantity,
                      'startDate', p.start_date,
                      'endDate', p.end_date,
                      'salePrice', p.sale_price,
                      'image', p.image
                    )
                  )
           FROM (SELECT id, name, price, image , quantity, start_date , end_date, sale_price
                 FROM products p
                 WHERE p.store_id = ${stores.id}
                   AND p.is_locked = false
                   AND p.deleted_at IS NULL
                   AND p.name ILIKE '%' || ${escapedQuery} || '%'
                   LIMIT 5 -- Thêm giới hạn 5 sản phẩm ở đây
                ) p)`.mapWith((val) => val ?? []),
        rating: sql`COALESCE
          (avg(
        ${ratings.storeRate}
        ),
        0
        )`.as('rating'),
        distance: distanceSql.mapWith(Number).as('distance'),
      })
      .from(stores)
      .leftJoin(ratings, eq(ratings.storeId, stores.id))
      .where(
        and(
          eq(stores.status, true),
          // sql`${distanceSql} < 15`, // Giới hạn khoảng cách 15km
          eq(stores.isLocked, false),
          not(isNull(stores.location)),
          ...(nearestAreaId ? [eq(stores.areaId, nearestAreaId)] : []),
          ...(escapedQuery
            ? [
                or(
                  // Sử dụng full-text search nếu có thể
                  ilike(stores.name, `%${escapedQuery}%`),
                  exists(
                    this.db
                      .select({ id: products.id })
                      .from(products)
                      .where(
                        and(
                          eq(products.storeId, stores.id),
                          eq(products.isLocked, false),
                          isNull(products.deletedAt),
                          ilike(products.name, `%${escapedQuery}%`),
                        ),
                      )
                      .limit(1),
                  ),
                ),
              ]
            : []),
        ),
      )
      .groupBy(stores.id)

      .orderBy(
        sql`distance
        ASC`,
      )
      .$dynamic();

    withPagination(qb, reqDto.limit, reqDto.offset);

    const [entities, [{ totalCount }]] = await Promise.all([
      qb,
      this.db
        .select({ totalCount: count().mapWith(Number) })
        .from(stores)
        .leftJoin(ratings, eq(ratings.storeId, stores.id))
        .where(
          and(
            eq(stores.status, true),
            eq(stores.isLocked, false),
            ...(nearestAreaId ? [eq(stores.areaId, nearestAreaId)] : []),
            // sql`${distanceSql} < 15`,
            not(isNull(stores.location)),
            ...(escapedQuery
              ? [
                  or(
                    ilike(stores.name, `%${escapedQuery}%`),
                    exists(
                      this.db
                        .select({ id: products.id })
                        .from(products)
                        .where(
                          and(
                            eq(products.storeId, stores.id),
                            eq(products.isLocked, false),
                            isNull(products.deletedAt),
                            ilike(products.name, `%${escapedQuery}%`),
                          ),
                        )
                        .limit(1),
                    ),
                  ),
                ]
              : []),
          ),
        ),
    ]);

    const entitiesWithDistance = entities.map((e) => ({
      ...e,
      distance: formatDistance(e.distance),
    }));
    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entitiesWithDistance, meta);
  }

  async getStoresForList(reqDto: QueryListStore, payload: JwtPayloadType) {
    console.log('reqDto', reqDto);
    const qb = this.db
      .select({
        name: stores.name,
        id: stores.id,
        areaId: stores.areaId,
        user: {
          id: users.id,
          phone: users.phone,
        },
      })
      .from(stores)
      .leftJoin(users, eq(users.id, stores.userId))
      .$dynamic();

    switch (payload.role) {
      case RoleEnum.ADMIN:
        qb.where(
          and(
            eq(stores.isLocked, false),
            ...(reqDto.areaId ? [eq(stores.areaId, reqDto.areaId)] : []),
            ...(reqDto.input
              ? [
                  or(
                    ilike(users.phone, `%${reqDto.input}%`),
                    ilike(stores.name, `%${reqDto.input}%`),
                  ),
                ]
              : []),
          ),
        );
        break;
      case RoleEnum.MANAGEMENT:
        qb.where(
          and(
            eq(stores.isLocked, false),
            eq(stores.areaId, payload.areaId),
            ...(reqDto.input
              ? [
                  or(
                    ilike(users.phone, `%${reqDto.input}%`),
                    ilike(stores.name, `%${reqDto.input}%`),
                  ),
                ]
              : []),
          ),
        );
        break;
      default:
        throw new UnauthorizedException();
    }

    qb.limit(20);
    return qb;
  }

  async checkStoreActive(storeId: number, tx: Transaction) {
    const [store] = await tx
      .select({
        id: stores.id,
        status: stores.status,
        openTime: stores.openTime,
        closeTime: stores.closeTime,
        openSecondTime: stores.openSecondTime,
        closeSecondTime: stores.closeSecondTime,
      })
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new ValidationException(ErrorCode.S001); // Không tìm thấy cửa hàng
    }

    // Nếu status = false => cửa hàng đang đóng (bất kể giờ giấc)
    if (!store.status) {
      throw new ValidationException(ErrorCode.S003);
    }

    const now = DateTime.now().setZone('Asia/Ho_Chi_Minh');
    const { openTime, closeTime, openSecondTime, closeSecondTime } = this.getStoreTimeRanges(
      store,
      now,
    );

    const isOpen = this.checkIsStoreOpen(now, openTime, closeTime, openSecondTime, closeSecondTime);

    this.logTimeDebug(now, openTime, closeTime, openSecondTime, closeSecondTime);

    if (!isOpen) {
      throw new ValidationException(ErrorCode.S003); // Ngoài giờ mở cửa
    }
  }

  /**
   * Gộp giờ/phút/giây từ `time` vào ngày `base` (giữ nguyên ngày/tháng/năm của `base`)
   */
  private buildTime(base: DateTime, time: Date): DateTime {
    const timeOnly = DateTime.fromJSDate(time, { zone: 'Asia/Ho_Chi_Minh' });

    return base.set({
      hour: timeOnly.hour,
      minute: timeOnly.minute,
      second: timeOnly.second,
    });
  }

  private logTimeDebug(
    now: DateTime,
    openTime: DateTime,
    closeTime: DateTime,
    openSecondTime: DateTime | null,
    closeSecondTime: DateTime | null,
  ) {
    console.debug('📅 Store is currently closed at:', now.toFormat('HH:mm'));
    console.debug('⏰ Shift 1:', openTime.toFormat('HH:mm'), '-', closeTime.toFormat('HH:mm'));
    if (openSecondTime && closeSecondTime) {
      console.debug(
        '⏰ Shift 2:',
        openSecondTime.toFormat('HH:mm'),
        '-',
        closeSecondTime.toFormat('HH:mm'),
      );
    }
  }

  private checkIsStoreOpen(
    now: DateTime,
    openTime: DateTime,
    closeTime: DateTime,
    openSecondTime: DateTime | null,
    closeSecondTime: DateTime | null,
  ): boolean {
    const isBetween = (now: DateTime, start: DateTime, end: DateTime) =>
      start < end ? now >= start && now <= end : now >= start || now <= end;

    return (
      isBetween(now, openTime, closeTime) ||
      (openSecondTime && closeSecondTime && isBetween(now, openSecondTime, closeSecondTime))
    );
  }

  private getStoreTimeRanges(
    store: {
      openTime: Date;
      closeTime: Date;
      openSecondTime: Date | null;
      closeSecondTime: Date | null;
    },
    now: DateTime,
  ) {
    const build = (t?: Date) => (t ? this.buildTime(now, t) : null);

    return {
      openTime: build(store.openTime),
      closeTime: build(store.closeTime),
      openSecondTime: build(store.openSecondTime),
      closeSecondTime: build(store.closeSecondTime),
    };
  }

  async updateByUserId(userId: number, reqDto: UpdateStoreReqDto) {
    // kiểm tra cập nhật 2 khung giờ openTime closeTime , openSecorndTime , closeSecondTime

    const store = await this.db
      .update(stores)
      .set({
        ...reqDto,
      })
      .where(eq(stores.userId, userId))
      .returning()
      .then((res) => res[0]);

    console.log('store', store);
    if (!store) {
      throw new ValidationException(ErrorCode.S001);
    }
    return plainToInstance(StoreResDto, store);
  }

  private async buildFileName(prefix: string): Promise<string> {
    const uniqueId = uuidv4();
    return `${prefix}_${uniqueId}.jpeg`;
  }

  async updateBackgroundByUserId(userId: number, background: Express.Multer.File) {
    const existStore = await this.existStoreByUserId(userId);
    if (!existStore) {
      throw new ValidationException(ErrorCode.S001);
    }
    console.log('existStore.background', existStore.background);
    // Remove old background image if exists
    if (existStore.background) {
      deleteIfExists(existStore.background, this.basePath);
    }
    const fileName = await this.buildFileName('store_background');
    const fullImagePath = join(this.basePath, fileName);
    await sharp(background.buffer).jpeg({ quality: 80 }).toFile(fullImagePath);

    return await this.db
      .update(stores)
      .set({
        background: normalizeImagePath(fullImagePath),
      })
      .where(eq(stores.userId, userId))
      .returning()
      .then((res) => plainToInstance(StoreResDto, res[0]));
  }

  async updateBackgroundByStoreId(storeId: number, background: Express.Multer.File) {
    const existStore = await this.existById(storeId);
    if (!existStore) {
      throw new ValidationException(ErrorCode.S001);
    }
    if (existStore.background) {
      deleteIfExists(existStore.background, this.basePath);
    }
    const fileName = await this.buildFileName('store_background');
    const fullImagePath = join(this.basePath, fileName);
    await sharp(background.buffer).jpeg({ quality: 80 }).toFile(fullImagePath);

    return await this.db
      .update(stores)
      .set({
        background: normalizeImagePath(fullImagePath),
      })
      .where(eq(stores.id, storeId))
      .returning()
      .then((res) => plainToInstance(StoreResDto, res[0]));
  }

  async updateAvatarByUserId(userId: number, avatar: Express.Multer.File) {
    const existStore = await this.existStoreByUserId(userId);
    if (!existStore) {
      throw new ValidationException(ErrorCode.S001);
    }
    if (existStore.avatar) {
      deleteIfExists(existStore.avatar, this.basePath);
    }
    const fileName = await this.buildFileName('store_avatar');
    const fullImagePath = join(this.basePath, fileName);
    await sharp(avatar.buffer).jpeg({ quality: 80 }).toFile(fullImagePath);

    return await this.db
      .update(stores)
      .set({
        avatar: normalizeImagePath(fullImagePath),
      })
      .where(eq(stores.userId, userId))
      .returning()
      .then((res) => {
        console.log('res', res);
        return plainToInstance(StoreResDto, res[0]);
      });
  }

  async updateAvatarByStoreId(storeId: number, avatar: Express.Multer.File) {
    const existStore = await this.existById(storeId);
    if (!existStore) {
      throw new ValidationException(ErrorCode.S001);
    }
    if (existStore.avatar) {
      deleteIfExists(existStore.avatar, this.basePath);
    }
    const fileName = await this.buildFileName('store_avatar');
    const fullImagePath = join(this.basePath, fileName);
    await sharp(avatar.buffer).jpeg({ quality: 80 }).toFile(fullImagePath);

    return await this.db
      .update(stores)
      .set({
        avatar: normalizeImagePath(fullImagePath),
      })
      .where(eq(stores.id, storeId))
      .returning()
      .then((res) => {
        console.log('res', res);
        return plainToInstance(StoreResDto, res[0]);
      });
  }

  async getStoreByUserId(userId: number) {
    const store = await this.db
      .select({
        ...getTableColumns(stores),
        user: users,
      })
      .from(stores)
      .leftJoin(users, eq(users.id, stores.userId))
      .where(eq(stores.userId, userId))
      .then((res) => res[0]);

    if (!store) {
      throw new ValidationException(ErrorCode.S001);
    }

    if (store.isLocked) {
      // Kiểm tra xem cửa hàng có bị khoá hay không
      return new ValidationException(ErrorCode.S005);
    }
    return plainToInstance(StoreResDto, store);
  }

  async selectFcmTokenById(storeId: number) {
    return await this.db
      .select({
        fcmToken: users.fcmToken,
      })
      .from(users)
      .leftJoin(stores, eq(stores.userId, users.id))
      .where(eq(stores.id, storeId))
      .then((res) => res[0] ?? null);
  }

  async getValidStoreFcmTokenByStoreId(storeId: number) {
    return this.db
      .select({
        fcmToken: users.fcmToken,
      })
      .from(stores)
      .leftJoin(users, eq(users.id, stores.userId))
      .where(and(eq(stores.id, storeId), eq(stores.isLocked, false), isNotNull(users.fcmToken)))
      .then((res) => res[0] ?? null);
  }

  async getNearbyStoresWithMostVouchers(reqDto: NearbyStoresReqDto) {
    if (!reqDto.origins || !reqDto.origins.includes(',')) {
      throw new ValidationException(
        ErrorCode.S007,
        HttpStatus.BAD_REQUEST,
        'Invalid origins format. Expected format: "latitude,longitude"',
      );
    }
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);

    const nearestAreaId = await this.getNearestAreaId(latitude, longitude);

    const distanceSql = sql.raw(`
    6371 * acos(
      least(
        greatest(
          cos(radians(${latitude})) *
          cos(radians(CAST(split_part(stores.location, ',', 1) AS double precision))) *
          cos(radians(CAST(split_part(stores.location, ',', 2) AS double precision)) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(CAST(split_part(stores.location, ',', 1) AS double precision))),
          -1
        ),
        1
      )
    )
  `);

    // --- TRUY VẤN CHÍNH: có voucher
    const storesWithVouchers = await this.db
      .select({
        ...getTableColumns(stores),
        topVoucher: sql`
        (SELECT json_build_object(
                  'id', v.id,
                  'code', v.code,
                  'value', v.value
                )
         FROM vouchers v
         WHERE v.user_id = stores.user_id
           AND v.type = ${VouchersTypeEnum.STORE}
           AND v.status = ${VouchersStatusEnum.ACTIVE}
           AND v.discount_type = ${DiscountTypeEnum.PERCENTAGE}
           AND v.deleted_at IS NULL
         ORDER BY v.value DESC LIMIT 1)`.mapWith((val) => val ?? null),
        distance: distanceSql.mapWith(Number).as('distance'),
        voucherCount: sql`
        (SELECT COUNT(*)
         FROM vouchers v
         WHERE v.user_id = stores.user_id
           AND v.type = ${VouchersTypeEnum.STORE}
           AND v.status = ${VouchersStatusEnum.ACTIVE}
           AND v.deleted_at IS NULL)`
          .mapWith(Number)
          .as('voucher_count'),
      })
      .from(stores)
      .leftJoin(users, eq(users.id, stores.userId))
      .leftJoin(orders, eq(orders.storeId, stores.id))
      .where(
        and(
          ...(nearestAreaId ? [eq(stores.areaId, nearestAreaId)] : []),
          eq(stores.status, true),
          eq(stores.isLocked, false),
          isNotNull(stores.location),
          storeIsOpenSql(),
          sql.raw(`
          EXISTS (
            SELECT 1 FROM vouchers v
            WHERE v.user_id = stores.user_id
              AND v.type = '${VouchersTypeEnum.STORE}'
              AND v.status = '${VouchersStatusEnum.ACTIVE}'
              AND v.discount_type = '${DiscountTypeEnum.PERCENTAGE}'
              AND v.deleted_at IS NULL
          )
        `),
          // sql`${distanceSql} < 15`,
        ),
      )
      .groupBy(stores.id)
      .orderBy(desc(sql`voucher_count`), sql`distance ASC`)
      .limit(15)
      .$dynamic();

    if (storesWithVouchers.length > 0) return storesWithVouchers;

    // --- TRUY VẤN DỰ PHÒNG: random 15 cửa hàng gần nhất
    return this.db
      .select({
        ...getTableColumns(stores),
        distance: distanceSql.mapWith(Number).as('distance'),
      })
      .from(stores)
      .where(
        and(
          eq(stores.status, true),
          eq(stores.isLocked, false),
          isNotNull(stores.location),
          storeIsOpenSql(),
          // sql`${distanceSql} < 15`,
        ),
      )
      .orderBy(
        sql`RANDOM
      ()`,
      )
      .limit(15)
      .$dynamic();
  }

  async recentlyViewedStore(userId: number, storeId: number) {
    return this.db.transaction(async (tx) => {
      await tx
        .insert(viewedStores)
        .values({ userId, storeId, lastViewedAt: new Date() })
        .onConflictDoUpdate({
          target: [viewedStores.userId, viewedStores.storeId],
          set: { lastViewedAt: new Date() },
        });

      const storeIdsToDelete = await tx
        .select({ storeId: viewedStores.storeId })
        .from(viewedStores)
        .where(eq(viewedStores.userId, userId))
        .orderBy(desc(viewedStores.lastViewedAt))
        .offset(15); // Lấy các bản ghi thừa

      if (storeIdsToDelete.length > 0) {
        await tx.delete(viewedStores).where(
          and(
            eq(viewedStores.userId, userId),
            inArray(
              viewedStores.storeId,
              storeIdsToDelete.map((s) => s.storeId),
            ),
          ),
        );
      }
    });
  }

  async getRecentlyViewedStores(userId: number) {
    return this.db.query.viewedStores.findMany({
      where: eq(viewedStores.userId, userId),
      with: {
        store: true,
      },
      orderBy: desc(viewedStores.lastViewedAt),
      limit: 15,
    });
  }

  async getNearbyProductsWithMostOrdersThisWeek(reqDto: NearbyStoresReqDto) {
    if (!reqDto.origins || !reqDto.origins.includes(',')) {
      throw new ValidationException(
        ErrorCode.S007,
        HttpStatus.BAD_REQUEST,
        'Invalid origins format. Expected format: "latitude,longitude"',
      );
    }
    const [lat, lng] = reqDto.origins.split(',').map(Number);

    const nearestAreaId = await this.getNearestAreaId(lat, lng);

    // distanceSql có clamp [-1,1] để tránh lỗi acos
    //   const distanceSql = sql.raw(`
    //   6371 * acos(
    //     least(
    //       greatest(
    //         cos(radians(${lat})) *
    //         cos(radians(CAST(split_part(stores.location, ',', 1) AS double precision))) *
    //         cos(radians(CAST(split_part(stores.location, ',', 2) AS double precision)) - radians(${lng})) +
    //         sin(radians(${lat})) *
    //         sin(radians(CAST(split_part(stores.location, ',', 1) AS double precision))),
    //         -1
    //       ),
    //       1
    //     )
    //   )
    // `);

    return this.db
      .select({
        ...getTableColumns(products),
        store: stores,
        topVoucher: sql`
          (SELECT json_build_object(
                    'id', v.id,
                    'code', v.code,
                    'value', v.value
                  )
           FROM vouchers v
           WHERE v.user_id = stores.user_id
             AND v.type = ${VouchersTypeEnum.STORE}
             AND v.status = ${VouchersStatusEnum.ACTIVE}
             AND v.discount_type = ${DiscountTypeEnum.PERCENTAGE}
             AND v.deleted_at IS NULL
           ORDER BY v.value DESC LIMIT 1)
        `.mapWith((val) => val ?? null),
        orderCount: sql`COALESCE(oc.order_count, 0)`.mapWith(Number).as('order_count'),
      })
      .from(products)
      .leftJoin(stores, eq(stores.id, products.storeId))
      .leftJoin(
        sql`
          (SELECT od.product_id, COUNT(DISTINCT od.order_id) AS order_count
           FROM order_details od
                  JOIN orders o ON o.id = od.order_id
           WHERE date_trunc('week', o.created_at) = date_trunc('week', now())
           GROUP BY od.product_id)
          AS oc
        `,
        eq(
          products.id,
          sql`oc
          .
          product_id`,
        ),
      )
      .where(
        and(
          eq(products.isLocked, false),
          isNotNull(products.image),
          isNull(products.deletedAt),
          eq(stores.status, true),
          ...(nearestAreaId ? [eq(stores.areaId, nearestAreaId)] : []),
          eq(stores.isLocked, false),
          isNotNull(stores.location),
          storeIsOpenSql(),
          // sql`${distanceSql} < 15`, // lọc theo bán kính 15km
        ),
      )
      .orderBy(desc(sql`order_count`))
      .limit(15);
  }
}
