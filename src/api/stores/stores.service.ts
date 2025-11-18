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
  orderDetails,
  orders,
  OrderStatusEnum,
  products,
  RoleEnum,
  stores,
  users,
  VouchersStatusEnum,
  VouchersTypeEnum,
} from '@/database/schemas';
import { privateSetting } from '@/database/schemas/private-setting.schema';
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
  AnyColumn,
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
  SQL,
} from 'drizzle-orm';
import { existsSync, mkdirSync } from 'fs';
import { DateTime } from 'luxon';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StoresService implements OnModuleInit {
  private basePath = `uploads/stores`;
  private static readonly ACCENT_GROUPS = [
    { from: 'àáảãạăằắẳẵặâầấẩẫậ', to: 'a' },
    { from: 'èéẻẽẹêềếểễệ', to: 'e' },
    { from: 'ìíỉĩị', to: 'i' },
    { from: 'òóỏõọôồốổỗộơờớởỡợ', to: 'o' },
    { from: 'ùúủũụưừứửữự', to: 'u' },
    { from: 'ỳýỷỹỵ', to: 'y' },
    { from: 'đ', to: 'd' },
  ] as const;
  private static readonly ACCENTED_CHARS = StoresService.ACCENT_GROUPS.map(
    (group) => group.from,
  ).join('');
  private static readonly UNACCENTED_CHARS = StoresService.ACCENT_GROUPS.map((group) =>
    group.to.repeat(Array.from(group.from).length),
  ).join('');

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

  async getPageStores(reqDto: PageStoreReqDto, _payload: JwtPayloadType) {
    // Parse latitude and longitude from origins
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);

    const [setting] = await this.db
      .select({
        numberRadius: privateSetting.numberRadius,
        numberStores: privateSetting.numberStores,
      })
      .from(privateSetting)
      .where(eq(privateSetting.id, 1));

    // Quan trọng: Xử lý trường hợp không tìm thấy setting để tránh lỗi
    if (!setting || !setting.numberRadius || !setting.numberStores) {
      // Bạn có thể trả về lỗi hoặc một danh sách rỗng tùy theo logic nghiệp vụ
      throw new Error('Private setting is not configured correctly.');
    }

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

    const whereConditions = and(
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
      // <-- THAY ĐỔI 1: Lọc theo bán kính từ setting ---
      sql`${distanceSql} < ${setting.numberRadius}`,
    );

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
      .where(whereConditions) // <-- Sử dụng điều kiện đã định nghĩa
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

    withPagination(baseQb, setting.numberStores, reqDto.offset);

    // Execute queries in parallel
    const [entities, { totalCount }] = await Promise.all([
      baseQb,
      // <-- THAY ĐỔI 3: Câu lệnh đếm tổng số cũng phải có điều kiện về khoảng cách ---
      this.db
        .select({ totalCount: count() })
        .from(stores)
        // distanceSql cần select từ stores nên cần join
        .where(whereConditions) // <-- Tái sử dụng điều kiện để đảm bảo count chính xác
        .then((res) => res[0] ?? { totalCount: 0 }),
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

  async searchStore(reqDto: SearchPageStoresReqDto, userId: number) {
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new ValidationException(
        ErrorCode.S007,
        HttpStatus.BAD_REQUEST,
        'Invalid origins format. Expected format: "latitude,longitude"',
      );
    }

    const nearestAreaId = await this.getNearestAreaId(latitude, longitude);

    const rawQuery = reqDto.q ? reqDto.q.trim() : '';
    const normalizedQuery = rawQuery ? this.normalizeSearchTerm(rawQuery) : '';
    const normalizedPattern = normalizedQuery ? `%${normalizedQuery}%` : '';

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

    // ✅ OPTIMIZED: Fetch stores WITHOUT products (no JSON aggregation)
    const qb = this.db
      .select({
        ...getTableColumns(stores),
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
          ...(normalizedPattern
            ? [
                or(
                  sql`${this.toSearchableSql(stores.name)} LIKE ${normalizedPattern}`,
                  exists(
                    this.db
                      .select({ id: products.id })
                      .from(products)
                      .where(
                        and(
                          eq(products.storeId, stores.id),
                          eq(products.isLocked, false),
                          isNull(products.deletedAt),
                          sql`${this.toSearchableSql(products.name)} LIKE ${normalizedPattern}`,
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
            ...(normalizedPattern
              ? [
                  or(
                    sql`${this.toSearchableSql(stores.name)} LIKE ${normalizedPattern}`,
                    exists(
                      this.db
                        .select({ id: products.id })
                        .from(products)
                        .where(
                          and(
                            eq(products.storeId, stores.id),
                            eq(products.isLocked, false),
                            isNull(products.deletedAt),
                            sql`${this.toSearchableSql(products.name)} LIKE ${normalizedPattern}`,
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

    // ✅ OPTIMIZED: Batch fetch products for all stores in one query
    const productsMap = await this.batchFetchStoreProducts(
      entities.map((s) => s.id),
      rawQuery,
    );

    // Lấy danh sách productId và tổng số lượng flash sale mà user đã mua (chỉ khi đã đăng nhập)
    let userPurchasedQuantities = new Map<number, number>();

    if (userId > 0) {
      userPurchasedQuantities = await this.db
        .select({
          productId: orderDetails.productId,
          totalQuantity: sql<number>`SUM(${orderDetails.quantity})`.as('totalQuantity'),
        })
        .from(orderDetails)
        .where(and(eq(orderDetails.userId, userId), eq(orderDetails.isSale, true)))
        .groupBy(orderDetails.productId)
        .then((results) => {
          const map = new Map<number, number>();
          results.forEach((r) => {
            if (r.productId !== null) {
              map.set(r.productId, Number(r.totalQuantity) || 0);
            }
          });
          return map;
        });
    }

    // ✅ OPTIMIZED: Combine stores with products from Map
    // Xử lý dữ liệu: thêm canOrderMoreFlashSale cho từng product
    // Logic:
    // - limitedFlashSaleQuantity = 0: Không có flash sale → canOrderMoreFlashSale = false
    // - limitedFlashSaleQuantity > 0: Có flash sale → check startDate, endDate và userPurchasedQty
    const entitiesWithFlashSaleCheck = entities.map((store) => ({
      ...store,
      products:
        (productsMap.get(store.id) || [])?.map((product: any) => {
          const userPurchasedQty = product.id
            ? userPurchasedQuantities.get(product.id as number) || 0
            : 0;
          const limitedQty = Number(product.limitedFlashSaleQuantity) || 0;
          const now = new Date();
          const startDate = product.startDate ? new Date(product.startDate as string) : null;
          const endDate = product.endDate ? new Date(product.endDate as string) : null;

          // Check flash sale còn hiệu lực không
          const isFlashSaleActive =
            startDate && endDate && now >= startDate && now <= endDate && limitedQty > 0;

          // Chỉ true khi: có flash sale đang active VÀ user chưa mua đủ giới hạn
          const canOrderMoreFlashSale = Boolean(isFlashSaleActive && userPurchasedQty < limitedQty);

          return {
            ...product,
            canOrderMoreFlashSale,
          };
        }) || [],
    }));

    const entitiesWithDistance = entitiesWithFlashSaleCheck.map((e) => ({
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

    // check bất buộc có giờ mở cửa và đóng cửa
    if (!store.openTime || !store.closeTime) {
      throw new ValidationException(ErrorCode.S008); // Cửa hàng chưa thiết lập giờ mở cửa
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
          ...(nearestAreaId ? [eq(stores.areaId, nearestAreaId)] : []),
          eq(stores.status, true),
          eq(stores.isLocked, false),
          isNotNull(stores.location),
          storeIsOpenSql(),
          // sql`${distanceSql} < 15`,
        ),
      )
      .orderBy(sql`random()`)
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

  async getNearbyProductsWithMostOrdersThisWeek(reqDto: NearbyStoresReqDto, userId: number) {
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

    // Subquery để tính tổng số lượng user đã mua của từng sản phẩm
    const userPurchasedSubquery = this.db
      .select({
        productId: orderDetails.productId,
        totalQuantity: sql<number>`COALESCE(SUM(${orderDetails.quantity}), 0)`.as('totalQuantity'),
      })
      .from(orderDetails)
      .where(and(eq(orderDetails.userId, userId), eq(orderDetails.isSale, true)))
      .groupBy(orderDetails.productId)
      .as('user_purchased');

    const nearbyProducts = await this.db
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
        userPurchasedQty: sql<number>`COALESCE(${userPurchasedSubquery.totalQuantity}, 0)`,
      })
      .from(products)
      .leftJoin(stores, eq(stores.id, products.storeId))
      .leftJoin(userPurchasedSubquery, eq(products.id, userPurchasedSubquery.productId))
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

    // Thêm canOrderMoreFlashSale cho mỗi product
    return nearbyProducts.map((product) => {
      const userPurchasedQuantity = Number(product.userPurchasedQty) || 0;
      const limitedQty = Number(product.limitedFlashSaleQuantity) || 0;
      const now = new Date();
      const startDate = product.startDate ? new Date(product.startDate as Date) : null;
      const endDate = product.endDate ? new Date(product.endDate as Date) : null;

      // Check flash sale còn hiệu lực không
      const isFlashSaleActive =
        startDate && endDate && now >= startDate && now <= endDate && limitedQty > 0;

      // Chỉ true khi: có flash sale đang active VÀ user chưa mua đủ giới hạn
      const canOrderMoreFlashSale = Boolean(
        isFlashSaleActive && userPurchasedQuantity < limitedQty,
      );

      // Loại bỏ userPurchasedQty khỏi response, chỉ trả về canOrderMoreFlashSale
      const { userPurchasedQty: _userPurchasedQty, ...productWithoutUserQty } = product;
      return {
        ...productWithoutUserQty,
        canOrderMoreFlashSale,
      };
    });
  }

  async deleteByUserId(userId: number, tx: Transaction) {
    const store = await this.existStoreByUserId(userId);

    if (!store) {
      throw new ValidationException(ErrorCode.S001);
    }
    // xóa sản phẩm  và ảnh
    // await this.productsService.deleteByStoreId(store.storeId, tx);

    if (store.background) {
      deleteIfExists(store.background, this.basePath);
    }
    if (store.avatar) {
      deleteIfExists(store.avatar, this.basePath);
    }
    const [deletedStore] = await tx.delete(stores).where(eq(stores.userId, userId)).returning();
    return deletedStore;
  }

  /**
   * ✅ OPTIMIZED: Batch fetch products for multiple stores in a single query
   * Eliminates N+1 correlated subquery problem in searchStore()
   *
   * @param storeIds - Array of store IDs to fetch products for
   * @param searchQuery - Optional search query to filter products by name
   * @returns Map<storeId, products[]> with max 5 products per store
   */
  private async batchFetchStoreProducts(
    storeIds: number[],
    searchQuery?: string,
  ): Promise<Map<number, any[]>> {
    // Early return if no stores
    if (!storeIds || storeIds.length === 0) {
      return new Map();
    }

    const normalizedSearch = searchQuery ? this.normalizeSearchTerm(searchQuery) : '';
    const normalizedPattern = normalizedSearch ? `%${normalizedSearch}%` : '';

    // ✅ Single query to fetch products for all stores
    const allProducts = await this.db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        quantity: products.quantity,
        startDate: products.startDate,
        endDate: products.endDate,
        salePrice: products.salePrice,
        image: products.image,
        limitedFlashSaleQuantity: products.limitedFlashSaleQuantity,
        storeId: products.storeId,
      })
      .from(products)
      .where(
        and(
          inArray(products.storeId, storeIds),
          eq(products.isLocked, false),
          isNull(products.deletedAt),
          ...(normalizedPattern
            ? [sql`${this.toSearchableSql(products.name)} LIKE ${normalizedPattern}`]
            : []),
        ),
      )
      .orderBy(desc(products.createdAt)); // Order by createdAt to get latest products

    // ✅ Group products by storeId and limit to 5 per store
    const productsMap = new Map<number, any[]>();

    for (const product of allProducts) {
      if (!productsMap.has(product.storeId)) {
        productsMap.set(product.storeId, []);
      }

      const storeProducts = productsMap.get(product.storeId)!;
      // Limit to 5 products per store
      if (storeProducts.length < 5) {
        storeProducts.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: product.quantity,
          startDate: product.startDate,
          endDate: product.endDate,
          salePrice: product.salePrice,
          image: product.image,
          limitedFlashSaleQuantity: product.limitedFlashSaleQuantity,
        });
      }
    }

    return productsMap;
  }

  private normalizeSearchTerm(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase();
  }

  private toSearchableSql(column: AnyColumn | SQL): SQL {
    return sql`translate(lower(${column}), ${StoresService.ACCENTED_CHARS}, ${StoresService.UNACCENTED_CHARS})`;
  }
}
