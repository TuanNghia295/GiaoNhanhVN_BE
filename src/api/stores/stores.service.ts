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
import { DRIZZLE, queryWithCount, withPagination } from '@/database/global';
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
import { format } from 'date-fns';
import {
  and,
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
import { existsSync, mkdirSync } from 'fs';
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

  async existStoreByUserId(userId: number): Promise<{
    storeId: number;
  }> {
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
          eq(stores.isLocked, false),
          isNotNull(stores.location),
          ...(reqDto.areaId ? [eq(stores.areaId, reqDto.areaId)] : []),
        ),
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
    const [entities, totalCount] = await queryWithCount(baseQb);
    const entitiesWithDistance = entities.map((e) => ({
      ...e,
      distance: formatDistance(e.distance),
    }));

    // Create pagination metadata and return DTO
    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entitiesWithDistance, meta);
  }

  async getPageStoresByManager(reqDto: PageStoreManagerReqDto) {
    const qb = this.db
      .select({
        ...getTableColumns(stores),
        user: users,
      })
      .from(stores)
      .leftJoin(users, eq(users.id, stores.userId))
      .where(
        and(
          or(
            ilike(users.phone, `%${reqDto.q ?? ''}%`),
            ilike(stores.name, `%${reqDto.q ?? ''}%`),
          ),
          ...(reqDto.areaId ? [eq(stores.areaId, reqDto.areaId)] : []),
        ),
      )
      .orderBy(desc(stores.createdAt))
      .$dynamic();

    await withPagination(qb, reqDto.limit, reqDto.offset);
    const [entities, totalCount] = await queryWithCount(qb);

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
    const qb = this.db
      .select({
        ...getTableColumns(stores),
        products: sql
          .raw(
            `
          json_agg
          ( json_build_object(
            'id', products.id,
            'name', products.name,
            'price', products.price,
            'image', products.image
            ))
        `,
          )
          .as('products'),
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
      .innerJoin(
        products,
        and(
          eq(products.storeId, stores.id),
          eq(products.isLocked, false),
          isNull(products.deletedAt),
          ilike(products.name, `%${reqDto.q}%`),
        ),
      )
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
    const [entities, totalCount] = await queryWithCount(qb);

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

  async checkStoreActive(storeId: number) {
    const now = new Date();
    const nowTime = format(now, 'HH:mm:ss');
    console.log('nowTime', nowTime);
    const [store] = await this.db
      .select({
        id: stores.id,
        openTime: stores.openTime,
        closeTime: stores.closeTime,
        openSecondTime: stores.openSecondTime,
        closeSecondTime: stores.closeSecondTime,
      })
      .from(stores)
      .where(
        and(
          eq(stores.id, storeId),
          or(
            sql`${stores.openTime}::time <=
            ${nowTime}
            ::
            time`,
            sql`${stores.closeTime}::time >=
            ${nowTime}
            ::
            time`,
          ),
        ),
      );

    if (!store) {
      throw new ValidationException(ErrorCode.S003, HttpStatus.BAD_REQUEST);
    }
    return store;
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
}
