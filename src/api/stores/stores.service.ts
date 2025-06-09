import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { LockStoreReqDto } from '@/api/stores/dto/lock-store.req.dto';
import { PageStoreManagerReqDto } from '@/api/stores/dto/page-store-manager.req.dto';
import { PageStoreReqDto } from '@/api/stores/dto/page-store.req.dto';
import { QueryListStore } from '@/api/stores/dto/query-list-store.req.dto';
import { SearchPageStoresReqDto } from '@/api/stores/dto/search-page-stores-req.dto';
import { StoreResDto } from '@/api/stores/dto/store.res.dto';
import { UpdateStoreReqDto } from '@/api/stores/dto/update-store.req.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, Transaction, withPagination } from '@/database/global';
import {
  orders,
  OrderStatusEnum,
  products,
  stores,
  users,
} from '@/database/schemas';
import { ratings } from '@/database/schemas/rating.schema';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { formatDistance, normalizeImagePath } from '@/utils/util';
import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
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
  isNotNull,
  isNull,
  not,
  or,
  sql,
} from 'drizzle-orm';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { DateTime } from 'luxon';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export enum VehicleType {
  BIKE = 'bike',
  CAR = 'car',
  TRUCK = 'truck',
  Taxi = 'taxi',
}

interface DistanceInfo {
  text: string;
  value: any;
}

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

  async existById(storeId: number): Promise<{
    storeId: number;
  }> {
    return await this.db
      .select({
        storeId: stores.id,
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

  async getPageStores(reqDto: PageStoreReqDto, payload: JwtPayloadType) {
    // Parse latitude and longitude from origins
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);

    console.log('abacascascas', reqDto);

    // Base query builder
    const baseQb = this.db
      .select({
        ...getTableColumns(stores),
        rating: avg(ratings.storeRate).mapWith(String).as('rating'),
        distance: sql
          .raw(
            `
        6371 * acos(
          cos(radians(${latitude})) *
          cos(radians(CAST(split_part(stores.location, ',', 1) AS double precision))) *
          cos(radians(CAST(split_part(stores.location, ',', 2) AS double precision)) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(CAST(split_part(stores.location, ',', 1) AS double precision)))
        )
      `,
          )
          .mapWith(Number)
          .as('distance'),
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
          ...(reqDto.areaId ? [eq(stores.areaId, reqDto.areaId)] : []),
        ),
      )
      .having(
        sql.raw(`
          6371 * acos(
            cos(radians(${latitude})) *
            cos(radians(CAST(split_part(stores.location, ',', 1) AS double precision))) *
            cos(radians(CAST(split_part(stores.location, ',', 2) AS double precision)) - radians(${longitude})) +
            sin(radians(${latitude})) *
            sin(radians(CAST(split_part(stores.location, ',', 1) AS double precision)))
          ) < 15000
        `), // 15km radius
      )
      .$dynamic();

    if (reqDto.isBestSeller) {
      baseQb
        .leftJoin(
          orders,
          and(
            eq(orders.storeId, stores.id),
            eq(orders.status, OrderStatusEnum.DELIVERED),
          ),
        )
        .groupBy(stores.id)
        .orderBy(
          desc(sql`count
            (${orders.id})`),
          sql`distance asc`,
        );
    } else if (reqDto.isRating) {
      baseQb.orderBy(sql`rating desc`, sql`distance asc`).having(sql`avg
        (${ratings.storeRate})
        is not null`); // thêm sắp xếp khoảng cách
    } else {
      baseQb.orderBy(sql`distance asc`);
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
            ...(reqDto.areaId ? [eq(stores.areaId, reqDto.areaId)] : []),
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

  async getPageStoresByManager(reqDto: PageStoreManagerReqDto) {
    const whereClause = and(
      or(
        ilike(users.phone, `%${reqDto.q ?? ''}%`),
        ilike(stores.name, `%${reqDto.q ?? ''}%`),
      ),
      ...(reqDto.areaId ? [eq(stores.areaId, reqDto.areaId)] : []),
    );

    const qb = this.db
      .select({
        ...getTableColumns(stores),
        user: users,
      })
      .from(stores)
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
    return new OffsetPaginatedDto(
      entities.map((e) => plainToInstance(StoreResDto, e)),
      meta,
    );
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

    const escapedQuery = reqDto.q?.replace(/[%_]/g, '\\$&');

    const qb = this.db
      .select({
        ...getTableColumns(stores), // Ensure these columns are included in GROUP BY
        products: sql`
          (SELECT json_agg(
                    jsonb_build_object(
                      'id', p.id,
                      'name', p.name,
                      'price', p.price,
                      'image', p.image
                    )
                  )
           FROM products p
           WHERE p.store_id = ${stores.id}
             AND p.is_locked = false
             AND p.deleted_at IS NULL
             AND p.name ILIKE ${'%' + escapedQuery + '%'})
        `.as('products'),
        rating: sql`avg
          (${ratings.storeRate})`.as('rating'),
        distance: sql
          .raw(
            `
          6371 * acos(
            cos(radians(${latitude})) *
            cos(radians(CAST(split_part(stores.location, ',', 1) AS double precision))) *
            cos(radians(CAST(split_part(stores.location, ',', 2) AS double precision)) - radians(${longitude})) +
            sin(radians(${latitude})) *
            sin(radians(CAST(split_part(stores.location, ',', 1) AS double precision)))
          )
        `,
          )
          .mapWith(Number)
          .as('distance'),
      })
      .from(stores)
      .leftJoin(ratings, eq(ratings.storeId, stores.id))
      .where(
        and(
          eq(stores.status, true),
          eq(stores.isLocked, false),
          not(isNull(stores.location)),
        ),
      )
      .groupBy(stores.id)
      .orderBy(sql`distance asc`)
      .$dynamic();

    withPagination(qb, reqDto.limit, reqDto.offset);
    const [entities, { totalCount }] = await Promise.all([
      qb,
      this.db
        .select({ totalCount: count().mapWith(Number) })
        .from(stores)
        .leftJoin(ratings, eq(ratings.storeId, stores.id))
        .where(
          and(
            eq(stores.status, true),
            eq(stores.isLocked, false),
            not(isNull(stores.location)),
            or(
              ilike(stores.name, `%${escapedQuery}%`),
              ilike(users.phone, `%${escapedQuery}%`),
            ),
          ),
        )
        .then((res) => res[0]),
    ]);

    const entitiesWithDistance = entities.map((e) => ({
      ...e,
      distance: formatDistance(e.distance),
    }));
    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entitiesWithDistance, meta);
  }

  async getStoresForList(reqDto: QueryListStore) {
    return await this.db
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
      .where(
        and(
          eq(stores.isLocked, false),
          ...(reqDto.areaId ? [eq(stores.areaId, reqDto.areaId)] : []),
          and(
            or(
              ilike(users.phone, `%${reqDto.input ?? ''}%`),
              ilike(stores.name, `%${reqDto.input ?? ''}%`),
            ),
            ...(reqDto.areaId ? [eq(stores.areaId, reqDto.areaId)] : []),
          ),
        ),
      );
  }

  async checkStoreActive(storeId: number, tx: Transaction) {
    const [store] = await tx
      .select({
        id: stores.id,
        openTime: stores.openTime,
        closeTime: stores.closeTime,
        openSecondTime: stores.openSecondTime,
        closeSecondTime: stores.closeSecondTime,
      })
      .from(stores)
      .where(and(eq(stores.id, storeId)));

    if (!store) {
      throw new ValidationException(ErrorCode.S001);
    }
    console.log('store', store);

    const now = DateTime.now().setZone('Asia/Ho_Chi_Minh');

    const { openTime, closeTime, openSecondTime, closeSecondTime } =
      this.getStoreTimeRanges(store, now);

    const isOpen = this.checkIsStoreOpen(
      now,
      openTime,
      closeTime,
      openSecondTime,
      closeSecondTime,
    );

    if (!isOpen) {
      this.logTimeDebug(
        now,
        openTime,
        closeTime,
        openSecondTime,
        closeSecondTime,
      );
      throw new ValidationException(ErrorCode.S003);
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
    console.debug(
      '⏰ Shift 1:',
      openTime.toFormat('HH:mm'),
      '-',
      closeTime.toFormat('HH:mm'),
    );
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
      (openSecondTime &&
        closeSecondTime &&
        isBetween(now, openSecondTime, closeSecondTime))
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

  async updateBackgroundByUserId(
    userId: number,
    background: Express.Multer.File,
  ) {
    const existStore = await this.existStoreByUserId(userId);
    if (!existStore) {
      throw new ValidationException(ErrorCode.S001);
    }
    //remove old background image if exists
    if (existStore.background) {
      const oldImagePath = join(
        this.basePath,
        existStore.background.replace(/^\/+/, ''),
      );
      if (existsSync(oldImagePath)) {
        try {
          unlinkSync(oldImagePath);
        } catch (error) {
          console.error('Error removing old background image:', error);
        }
      }
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

  async updateAvatarByUserId(userId: number, avatar: Express.Multer.File) {
    const existStore = await this.existStoreByUserId(userId);
    if (!existStore) {
      throw new ValidationException(ErrorCode.S001);
    }
    if (existStore.avatar) {
      const oldImagePath = join(
        this.basePath,
        existStore.avatar.replace(/^\/+/, ''),
      );
      console.log('oldImagePath', oldImagePath);
      if (existsSync(oldImagePath)) {
        try {
          unlinkSync(oldImagePath);
        } catch (error) {
          console.error('Error removing old background image:', error);
        }
      }
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
}
