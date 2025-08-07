import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateStoreMenuReqDto } from '@/api/store-menus/dto/create-store-menu-req.dto';
import {
  PageStoreMenuReqDto,
  SortStoreMenuEnum,
} from '@/api/store-menus/dto/page-store-menu-req.dto';
import { StoreMenuResDto } from '@/api/store-menus/dto/store-menu.res.dto';
import { UpdateStoreMenuReqDto } from '@/api/store-menus/dto/update-store-menu-req.dto';
import { StoresService } from '@/api/stores/stores.service';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { products, storeMenus } from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, asc, count, desc, eq, isNull, SQL, sql } from 'drizzle-orm';

@Injectable()
export class StoreMenusService {
  constructor(
    private readonly storesService: StoresService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  async getPageStoreMenus(reqDto: PageStoreMenuReqDto) {
    let orderBy: SQL | undefined;

    switch (reqDto.sortBy) {
      case SortStoreMenuEnum.NAME_ASC:
        orderBy = asc(storeMenus.name);
        break;
      case SortStoreMenuEnum.NAME_DESC:
        orderBy = desc(storeMenus.name);
        break;
      case SortStoreMenuEnum.OLDEST:
        orderBy = asc(storeMenus.createdAt);
        break;
      case SortStoreMenuEnum.NEWEST:
      default:
        orderBy = desc(storeMenus.createdAt);
        break;
    }

    const baseConfig: FindManyQueryConfig<typeof this.db.query.storeMenus> = {
      where: and(eq(storeMenus.storeId, reqDto.storeId), isNull(storeMenus.deletedAt)),
      with: {
        products: {
          with: {
            categoryItem: true,
            extras: true,
            options: true,
          },
          // lấy ra sản phẩm chưa soft delete
          where: and(
            isNull(products.deletedAt),
            ...(!reqDto.isShop ? [eq(products.isLocked, false)] : []),
          ),
          orderBy: [asc(products.index), desc(products.createdAt)],
        },
      },
    };

    const qCount = this.db.query.storeMenus.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.storeMenus.findMany({
        ...baseConfig,
        orderBy,
        ...(reqDto.limit !== 10
          ? {
              limit: reqDto.limit,
              offset: reqDto.offset,
            }
          : {}),
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    // check not limit and offset
    if (reqDto.limit !== 10) {
      const meta = new OffsetPaginationDto(totalCount, reqDto);
      return new OffsetPaginatedDto(
        entities.map((e) => plainToInstance(StoreMenuResDto, e)),
        meta,
      );
    }
    return entities.map((e) => plainToInstance(StoreMenuResDto, e));
  }

  async create(storeId: number, dto: CreateStoreMenuReqDto) {
    if (!(await this.storesService.existById(storeId))) {
      throw new ValidationException(ErrorCode.S002);
    }

    return await this.db
      .insert(storeMenus)
      .values({
        storeId,
        name: dto.name,
      })
      .returning()
      .then((result) => plainToInstance(StoreMenuResDto, result[0]));
  }

  async existByStoreId(
    storeId: number,
    storeMenuId: number,
  ): Promise<{
    storeMenuId: number;
  }> {
    return await this.db
      .select({
        storeMenuId: storeMenus.id,
      })
      .from(storeMenus)
      .where(
        and(
          eq(storeMenus.storeId, storeId),
          eq(storeMenus.id, storeMenuId),
          // isNull(storeMenus.deletedAt),
        ),
      )
      .then((result) => result[0] ?? null);
  }

  async update(payload: JwtPayloadType, menuId: number, reqDto: UpdateStoreMenuReqDto) {
    const existStore = await this.storesService.existStoreByUserId(payload.id);
    if (!existStore) {
      throw new ValidationException(ErrorCode.S001);
    }

    if (!(await this.existByStoreId(existStore.storeId, menuId))) {
      throw new ValidationException(ErrorCode.SM002);
    }

    // Check if the menu exists in the store

    return await this.db
      .update(storeMenus)
      .set({
        ...reqDto,
      })
      .where(eq(storeMenus.id, menuId))
      .returning()
      .then((result) => plainToInstance(StoreMenuResDto, result[0]));
  }

  async softDelete(storeId: number, storeMenuId: number) {
    const existStore = await this.storesService.existById(storeId);
    if (!existStore) {
      throw new ValidationException(ErrorCode.S002);
    }

    const existStoreMenu = await this.existByStoreId(storeId, storeMenuId);

    if (!existStoreMenu) {
      throw new ValidationException(ErrorCode.SM002);
    }

    return await this.db.transaction(async (tx) => {
      // Soft delete all products associated with the store menu
      await tx
        .update(products)
        .set({
          deletedAt: new Date(),
          categoryItemId: null,
        })
        .where(eq(products.storeMenuId, storeMenuId));
      // Return the deleted store menu
      return await tx
        .update(storeMenus)
        .set({
          deletedAt: new Date(),
        })
        .returning()
        .where(eq(storeMenus.id, storeMenuId))
        .then((result) => plainToInstance(StoreMenuResDto, result[0]));
    });
  }

  async existById(storeMenuId: number): Promise<{
    storeMenuId: number;
  }> {
    return await this.db
      .select({
        storeMenuId: storeMenus.id,
      })
      .from(storeMenus)
      .where(and(eq(storeMenus.id, storeMenuId), isNull(storeMenus.deletedAt)))
      .then((result) => result[0] ?? null);
  }
}
