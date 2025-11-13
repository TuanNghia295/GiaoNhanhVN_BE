import { CategoryItemsService } from '@/api/category-items/category-items.service';
import { ExtrasService } from '@/api/extras/extras.service';
import { OptionsService } from '@/api/options/options.service';
import { CreateProductReqDto } from '@/api/products/dto/create-product.req.dto';
import { FlashSaleProductReqDto } from '@/api/products/dto/flash-sale-product.req.dto';
import { LockProductReqDto } from '@/api/products/dto/lock-product.req.dto';
import { PageProductReqDto } from '@/api/products/dto/page-product-req.dto';
import { ProductResDto } from '@/api/products/dto/product.res.dto';
import { SortProductReqDto } from '@/api/products/dto/sort-product.req.dto';
import { UpdateProductReqDto } from '@/api/products/dto/update-product.req.dto';
import { StoreMenusService } from '@/api/store-menus/store-menus.service';
import { StoresService } from '@/api/stores/stores.service';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, storeIsOpenSql, Transaction } from '@/database/global';
import { areas, orderDetails, products, stores } from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { deleteIfExists, normalizeImagePath } from '@/utils/util';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  ilike,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { existsSync, mkdirSync } from 'fs';
import { DateTime } from 'luxon';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';

@Injectable()
export class ProductsService implements OnModuleInit {
  private basePath = `uploads/products`;

  onModuleInit() {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
      console.log(`Đã tạo thư mục upload: ${this.basePath}`);
    }
  }

  constructor(
    private readonly extrasService: ExtrasService,
    private readonly optionsService: OptionsService,
    private readonly categoryItemsService: CategoryItemsService,
    private readonly storeMenusService: StoreMenusService,
    private readonly storesService: StoresService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async getPageProducts(reqDto: PageProductReqDto, payload: JwtPayloadType) {
    const filters = [
      isNull(products.deletedAt),
      ...(reqDto.storeId ? [eq(products.storeId, reqDto.storeId)] : []),
      ...(reqDto.categoryItemId ? [eq(products.categoryItemId, reqDto.categoryItemId)] : []),
      ...(reqDto.storeMenuId ? [eq(products.storeMenuId, reqDto.storeMenuId)] : []),
      ...(reqDto.q
        ? [
            or(
              ilike(products.name, `%${reqDto.q.trim().replace(/\s+/g, '%')}%`),
              ilike(products.description, `%${reqDto.q.trim().replace(/\s+/g, '%')}%`),
            ),
          ]
        : []),
    ];

    const baseConfig: FindManyQueryConfig<typeof this.db.query.products> = {
      where: and(...filters),
      with: {
        categoryItem: true,
        options: true,
        extras: true,
      },
    };

    const qCount = this.db.query.products.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.products.findMany({
        ...baseConfig,
        orderBy: desc(products.createdAt),
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    // Subquery để tính tổng số lượng user đã mua của từng sản phẩm flash sale
    const productIds = entities.map((e) => e.id);
    let userPurchasedMap: Record<number, number> = {};

    if (productIds.length > 0) {
      const userPurchased = await this.db
        .select({
          productId: orderDetails.productId,
          totalQuantity: sql<number>`COALESCE(SUM(${orderDetails.quantity}), 0)`.as(
            'totalQuantity',
          ),
        })
        .from(orderDetails)
        .where(
          and(
            eq(orderDetails.userId, payload.id),
            eq(orderDetails.isSale, true),
            sql`${orderDetails.productId} IN ${sql.raw(`(${productIds.join(',')})`)}`,
          ),
        )
        .groupBy(orderDetails.productId);

      userPurchasedMap = userPurchased.reduce(
        (acc, item) => {
          acc[item.productId] = Number(item.totalQuantity) || 0;
          return acc;
        },
        {} as Record<number, number>,
      );
    }

    // Thêm canOrderMoreFlashSale cho mỗi product
    const entitiesWithFlashSaleCheck = entities.map((product) => {
      const userPurchasedQuantity = userPurchasedMap[Number(product.id)] || 0;
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

      return {
        ...product,
        canOrderMoreFlashSale,
      };
    });

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(
      entitiesWithFlashSaleCheck.map((e) => plainToInstance(ProductResDto, e)),
      meta,
    );
  }

  async getProductById(productId: number, userId?: number) {
    const product = await this.db.query.products.findFirst({
      where: and(isNull(products.deletedAt), eq(products.id, productId)),
      with: {
        categoryItem: true,
        options: true,
        extras: true,
      },
    });

    if (!product) throw new ValidationException(ErrorCode.P001);

    // Chỉ tính flash sale khi có userId
    if (userId) {
      // Lấy tổng số lượng user đã mua của sản phẩm này
      const userPurchased = await this.db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${orderDetails.quantity}), 0)`.as(
            'totalQuantity',
          ),
        })
        .from(orderDetails)
        .where(
          and(
            eq(orderDetails.userId, userId),
            eq(orderDetails.isSale, true),
            eq(orderDetails.productId, productId),
          ),
        );

      const userPurchasedQuantity = Number(userPurchased[0]?.totalQuantity) || 0;
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

      return plainToInstance(ProductResDto, {
        ...product,
        canOrderMoreFlashSale,
      });
    }

    return plainToInstance(ProductResDto, product);
  }

  async create(reqDto: CreateProductReqDto) {
    //---------------------------------------------------
    // Check if the store exists
    //---------------------------------------------------
    const existStore = await this.storesService.existById(reqDto.storeId);
    if (!existStore) throw new ValidationException(ErrorCode.S001);

    //---------------------------------------------------
    // Check if the store menu exists
    //---------------------------------------------------
    const existStoreMenu = await this.storeMenusService.existById(reqDto.storeMenuId);
    if (!existStoreMenu) throw new ValidationException(ErrorCode.SM001);

    //---------------------------------------------------
    // Check if the category item exists
    //---------------------------------------------------
    const existCategoryItem = await this.categoryItemsService.existById(reqDto.categoryItemId);
    if (!existCategoryItem) throw new ValidationException(ErrorCode.CI001);

    if (reqDto.startDate) {
      reqDto.startDate = DateTime.fromJSDate(reqDto.startDate)
        .setZone('Asia/Ho_Chi_Minh')
        .startOf('day')
        .toJSDate();
    }

    if (reqDto.endDate) {
      reqDto.endDate = DateTime.fromJSDate(reqDto.endDate)
        .setZone('Asia/Ho_Chi_Minh')
        .endOf('day')
        .toJSDate();
    }

    return this.db.transaction(async (tx) => {
      const product = await tx
        .insert(products)
        .values({
          ...reqDto,
          // nếu fe có cập nhật quantity thì cập nhật saleQuantity
          // cứng để làm thành slider
          // ...(reqDto.quantity && { saleQuantity: reqDto.quantity }),
          storeMenuId: reqDto.storeMenuId,
          storeId: reqDto.storeId,
        })
        .returning();

      //---------------------------------------------------
      // Check if the options exist
      //---------------------------------------------------
      if (reqDto.options.length > 0) {
        await this.optionsService.createForProduct(product[0].id, reqDto.options, tx);
      }
      //---------------------------------------------------
      // Check if the extras exist
      //---------------------------------------------------
      if (reqDto.extras.length > 0) {
        await this.extrasService.createForProduct(product[0].id, reqDto.extras, tx);
      }
      return plainToInstance(ProductResDto, product[0]);
    });
  }

  async update(productId: number, reqDto: UpdateProductReqDto) {
    return this.db.transaction(async (tx) => {
      if (reqDto.startDate) {
        reqDto.startDate = DateTime.fromJSDate(reqDto.startDate)
          .setZone('Asia/Ho_Chi_Minh')
          .startOf('day')
          .toJSDate();
      }

      if (reqDto.endDate) {
        reqDto.endDate = DateTime.fromJSDate(reqDto.endDate)
          .setZone('Asia/Ho_Chi_Minh')
          .endOf('day')
          .toJSDate();
      }
      //---------------------------------------------------
      // Check if the product exists
      //---------------------------------------------------
      const existProduct = await this.db.query.products.findFirst({
        where: and(eq(products.id, productId)),
      });
      if (!existProduct) throw new ValidationException(ErrorCode.P001);

      //---------------------------------------------------
      // Check if the store menu exists
      //---------------------------------------------------
      if (reqDto.storeId) {
        const existStore = await this.storesService.existById(reqDto.storeId);
        if (!existStore) throw new ValidationException(ErrorCode.S001);
      }
      //---------------------------------------------------
      // Check if the category item exists
      //---------------------------------------------------
      if (reqDto.categoryItemId) {
        const existCategoryItem = await this.categoryItemsService.existById(reqDto.categoryItemId);
        if (!existCategoryItem) throw new ValidationException(ErrorCode.CI001);
      }
      if (reqDto.storeId) {
        //---------------------------------------------------
        // Check if the store exists
        //---------------------------------------------------
        const existStore = await this.storesService.existById(reqDto.storeId);
        if (!existStore) throw new ValidationException(ErrorCode.S001);
      }
      console.log('💕💕💕💕', reqDto);
      const [updateProduct] = await tx
        .update(products)
        .set({
          ...reqDto,
          //  nếu fe có cập nhật quantity thì reset saleQuantity
          ...(reqDto.quantity && { usedSaleQuantity: 0 }),
          // ...(reqDto.quantity && { saleQuantity: reqDto.quantity }),
        })
        .where(eq(products.id, productId))
        .returning();

      //---------------------------------------------------
      // Nếu cập nhật flash sale (startDate, endDate, salePrice) thì reset orderDetails
      //---------------------------------------------------
      const isFlashSaleUpdated =
        reqDto.startDate !== undefined ||
        reqDto.endDate !== undefined ||
        reqDto.salePrice !== undefined ||
        reqDto.limitedFlashSaleQuantity !== undefined;

      if (isFlashSaleUpdated) {
        await tx
          .update(orderDetails)
          .set({
            isSale: false,
            userId: null,
          })
          .where(eq(orderDetails.productId, productId));
      }

      //---------------------------------------------------
      // Update options if provided
      //---------------------------------------------------
      await this.optionsService.updateForProduct(productId, reqDto.options, tx);

      //---------------------------------------------------
      // Update extras if provided
      //---------------------------------------------------
      await this.extrasService.updateForProduct(productId, reqDto.extras, tx);

      return plainToInstance(ProductResDto, updateProduct);
    });
  }

  private async buildFileName(prefix: string): Promise<string> {
    const uniqueId = uuidv4();
    return `${prefix}_${uniqueId}.jpeg`;
  }

  async updateImageById(productId: number, image: Express.Multer.File) {
    //---------------------------------------------------
    // Check if the product exists
    //---------------------------------------------------
    const existProduct = await this.db.query.products.findFirst({
      where: and(eq(products.id, productId)),
    });
    if (!existProduct) throw new ValidationException(ErrorCode.P001);

    if (existProduct.image) {
      deleteIfExists(existProduct.image, this.basePath);
    }
    const fileName = await this.buildFileName('product');
    const fullImagePath = join(this.basePath, fileName);
    await sharp(image.buffer).jpeg({ quality: 80 }).toFile(fullImagePath);
    const normalizedPath = normalizeImagePath(fullImagePath);
    return this.db
      .update(products)
      .set({
        image: normalizedPath,
      })
      .where(eq(products.id, productId))
      .returning()
      .then((result) => plainToInstance(ProductResDto, result[0]));
  }

  async softDelete(productId: number) {
    //---------------------------------------------------
    // Check if the product exists
    //---------------------------------------------------
    const existProduct = await this.db.query.products.findFirst({
      where: and(eq(products.id, productId)),
    });
    if (!existProduct) throw new ValidationException(ErrorCode.P001);

    return this.db
      .update(products)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning()
      .then((result) => plainToInstance(ProductResDto, result[0]));
  }

  async lock(productId: number, reqDto: LockProductReqDto) {
    //---------------------------------------------------
    // Check if the product exists
    //---------------------------------------------------
    const existProduct = await this.db.query.products.findFirst({
      where: and(eq(products.id, productId)),
    });
    if (!existProduct) throw new ValidationException(ErrorCode.P001);

    return this.db
      .update(products)
      .set({
        isLocked: reqDto.isLocked,
      })
      .where(eq(products.id, productId))
      .returning()
      .then((result) => plainToInstance(ProductResDto, result[0]));
  }

  async sortProducts({ items }: SortProductReqDto) {
    await this.db.transaction(async (tx) => {
      for (const update of items) {
        await tx
          .update(products)
          .set({
            index: update.index,
          })
          .where(eq(products.id, update.productId));
      }
    });
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

  async getFlashSaleProducts(reqDto: FlashSaleProductReqDto, userId: number) {
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new ValidationException(ErrorCode.CV002);
    }

    // Công thức distance có clamp [-1,1]
    const _distanceSql = sql.raw(`
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

    //---------------------------------------------------
    // Lấy area gần nhất
    //---------------------------------------------------
    const nearestAreaId = await this.getNearestAreaId(latitude, longitude);
    console.log(`Nearest area ID: ${nearestAreaId}`);

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

    const flashSaleProducts = await this.db
      .select({
        ...getTableColumns(products),
        store: stores,
        userPurchasedQty: sql<number>`COALESCE(${userPurchasedSubquery.totalQuantity}, 0)`,
      })
      .from(products)
      .innerJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(userPurchasedSubquery, eq(products.id, userPurchasedSubquery.productId))
      .where(
        and(
          isNull(products.deletedAt),
          isNotNull(products.salePrice),
          eq(stores.isLocked, false),
          eq(stores.status, true),
          eq(products.isLocked, false),
          // Có sale price hợp lệ nhỏ hơn giá gốc
          // lt(products.salePrice, products.price),
          // sản phẩm phải có thời gian bắt đầu và kết thúc
          or(isNull(products.startDate), lte(products.startDate, new Date())),
          or(isNull(products.endDate), gte(products.endDate, new Date())),
          ...(nearestAreaId ? [eq(stores.areaId, nearestAreaId)] : []),
          // cửa hàng còn hoạt động
          storeIsOpenSql(),
          // số lượng sale phải lớn hơn 0
          gt(products.quantity, 0),
          // còn trong giới hạn số lượng sale đã bán
          lt(products.usedSaleQuantity, products.quantity),
          // Phải có giới hạn số lượng flash sale
          gt(products.limitedFlashSaleQuantity, 0),
          // User chưa mua đủ giới hạn
          sql`COALESCE(${userPurchasedSubquery.totalQuantity}, 0) < ${products.limitedFlashSaleQuantity}`,
        ),
      )
      .limit(15);

    // Thêm canOrderMoreFlashSale cho mỗi product
    // Logic:
    // - limitedFlashSaleQuantity = 0: Không có flash sale → canOrderMoreFlashSale = false
    // - limitedFlashSaleQuantity > 0: Có flash sale → check startDate, endDate và userPurchasedQty
    return flashSaleProducts.map((product) => {
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

  async deleteByStoreId(storeId: number, tx: Transaction) {
    const productsOfStore = await tx
      .select({
        id: products.id,
        image: products.image,
      })
      .from(products)
      .where(eq(products.storeId, storeId));

    for (const product of productsOfStore) {
      if (product.image) {
        deleteIfExists(product.image, this.basePath);
      }
    }
  }
}
