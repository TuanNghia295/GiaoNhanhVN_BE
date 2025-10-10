import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { SortStoreMenuReqDto } from '@/api/products/dto/sort-store-menu.req.dto';
import { CreateStoreMenuReqDto } from '@/api/store-menus/dto/create-store-menu-req.dto';
import { PageStoreMenuReqDto } from '@/api/store-menus/dto/page-store-menu-req.dto';
import { StoreMenuResDto } from '@/api/store-menus/dto/store-menu.res.dto';
import { UpdateStoreMenuReqDto } from '@/api/store-menus/dto/update-store-menu-req.dto';
import { StoresService } from '@/api/stores/stores.service';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { orderDetails, products, storeMenus } from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';

@Injectable()
export class StoreMenusService {
  constructor(
    private readonly storesService: StoresService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  async getPageStoreMenus(reqDto: PageStoreMenuReqDto, userId: number) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.storeMenus> = {
      where: and(eq(storeMenus.storeId, reqDto.storeId), isNull(storeMenus.deletedAt)),
      with: {
        products: {
          extras: {
            quantity: sql<number>`
                (${products.quantity} - COALESCE (${products.usedSaleQuantity}, 0))
            `.as('quantity'),
          },
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
      orderBy: [asc(storeMenus.index), desc(storeMenus.createdAt)],
    };

    const qCount = this.db.query.storeMenus.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.storeMenus.findMany({
        ...baseConfig,
        ...(reqDto.limit !== 10 ? { limit: reqDto.limit, offset: reqDto.offset } : {}),
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    // Lấy danh sách productId và tổng số lượng flash sale mà user đã mua
    const userPurchasedQuantities = await this.db
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

    // Xử lý dữ liệu: chỉ ẩn sale khi user đã mua đủ limitedFlashSaleQuantity
    // Logic canOrderMoreFlashSale:
    // - limitedFlashSaleQuantity = 0: Không có flash sale → canOrderMoreFlashSale = false
    // - limitedFlashSaleQuantity > 0: Có flash sale → check startDate, endDate và userPurchasedQty
    const processedEntities = entities.map((menu) => ({
      ...menu,
      products: menu.products.map((product) => {
        const userPurchasedQty = product.id
          ? userPurchasedQuantities.get(product.id as number) || 0
          : 0;
        const limitedQty = Number(product.limitedFlashSaleQuantity) || 0;
        const now = new Date();
        const startDate = product.startDate ? new Date(product.startDate as Date) : null;
        const endDate = product.endDate ? new Date(product.endDate as Date) : null;

        // Check flash sale còn hiệu lực không
        const isFlashSaleActive =
          startDate && endDate && now >= startDate && now <= endDate && limitedQty > 0;

        // Chỉ true khi: có flash sale đang active VÀ user chưa mua đủ giới hạn
        const canOrderMoreFlashSale = Boolean(isFlashSaleActive && userPurchasedQty < limitedQty);

        // Chỉ ẩn sale khi user đã mua đủ giới hạn (limitedQty > 0 và đã mua đủ)
        if (limitedQty > 0 && userPurchasedQty >= limitedQty) {
          return {
            ...product,
            salePrice: null,
            startDate: null,
            endDate: null,
            canOrderMoreFlashSale,
          };
        }

        return {
          ...product,
          canOrderMoreFlashSale,
        };
      }),
    }));

    if (reqDto.limit !== 10) {
      const meta = new OffsetPaginationDto(totalCount, reqDto);
      return new OffsetPaginatedDto(processedEntities, meta);
    } else {
      return processedEntities;
    }
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

  async sort(storeId: number, { items }: SortStoreMenuReqDto) {
    const existStore = await this.storesService.existById(storeId);
    if (!existStore) {
      throw new ValidationException(ErrorCode.S001);
    }

    await this.db.transaction(async (tx) => {
      for (const update of items) {
        await tx
          .update(storeMenus)
          .set({
            index: update.index,
          })
          .where(eq(storeMenus.id, update.storeMenuId));
      }
    });
  }
}
