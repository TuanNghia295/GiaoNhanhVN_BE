import { CategoryItemsService } from '@/api/category-items/category-items.service';
import { ExtrasService } from '@/api/extras/extras.service';
import { OptionsService } from '@/api/options/options.service';
import { CreateProductReqDto } from '@/api/products/dto/create-product.req.dto';
import { LockProductReqDto } from '@/api/products/dto/lock-product.req.dto';
import { PageProductReqDto } from '@/api/products/dto/page-product-req.dto';
import { ProductResDto } from '@/api/products/dto/product.res.dto';
import { UpdateProductReqDto } from '@/api/products/dto/update-product.req.dto';
import { StoreMenusService } from '@/api/store-menus/store-menus.service';
import { StoresService } from '@/api/stores/stores.service';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { products } from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { normalizeImagePath } from '@/utils/util';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

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

  async getPageProducts(reqDto: PageProductReqDto) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.products> = {
      where: and(
        isNull(products.deletedAt),
        eq(products.isLocked, false),
        ...(reqDto.storeId ? [eq(products.storeId, reqDto.storeId)] : []),
      ),
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

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(
      entities.map((e) => plainToInstance(ProductResDto, e)),
      meta,
    );
  }

  async getProductById(productId: number) {
    const product = await this.db.query.products.findFirst({
      where: and(
        isNull(products.deletedAt),
        eq(products.isLocked, false),
        eq(products.id, productId),
      ),
      with: {
        categoryItem: true,
        options: true,
        extras: true,
      },
    });

    if (!product) throw new ValidationException(ErrorCode.P001);
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
    const existStoreMenu = await this.storeMenusService.existById(
      reqDto.storeMenuId,
    );
    if (!existStoreMenu) throw new ValidationException(ErrorCode.SM001);

    //---------------------------------------------------
    // Check if the category item exists
    //---------------------------------------------------
    const existCategoryItem = await this.categoryItemsService.existById(
      reqDto.categoryItemId,
    );
    if (!existCategoryItem) throw new ValidationException(ErrorCode.CI001);

    return this.db.transaction(async (tx) => {
      const product = await tx
        .insert(products)
        .values({
          ...reqDto,
          storeMenuId: reqDto.storeMenuId,
          storeId: reqDto.storeId,
        })
        .returning();

      //---------------------------------------------------
      // Check if the options exist
      //---------------------------------------------------
      if (reqDto.options.length > 0) {
        await this.optionsService.createForProduct(
          product[0].id,
          reqDto.options,
          tx,
        );
      }
      //---------------------------------------------------
      // Check if the extras exist
      //---------------------------------------------------
      if (reqDto.extras.length > 0) {
        await this.extrasService.createForProduct(
          product[0].id,
          reqDto.extras,
          tx,
        );
      }
      return plainToInstance(ProductResDto, product[0]);
    });
  }

  async update(productId: number, reqDto: UpdateProductReqDto) {
    return this.db.transaction(async (tx) => {
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
      const existStoreMenu = await this.storeMenusService.existById(
        reqDto.storeMenuId,
      );
      if (!existStoreMenu) throw new ValidationException(ErrorCode.SM001);

      //---------------------------------------------------
      // Check if the category item exists
      //---------------------------------------------------
      const existCategoryItem = await this.categoryItemsService.existById(
        reqDto.categoryItemId,
      );
      if (!existCategoryItem) throw new ValidationException(ErrorCode.CI001);

      const [updateProduct] = await tx
        .update(products)
        .set({ ...reqDto })
        .where(eq(products.id, productId))
        .returning();

      //---------------------------------------------------
      // Update options if provided
      //---------------------------------------------------
      if (reqDto.options && reqDto.options.length > 0) {
        await this.optionsService.updateForProduct(
          productId,
          reqDto.options,
          tx,
        );
      }

      //---------------------------------------------------
      // Update extras if provided
      //---------------------------------------------------
      if (reqDto.extras && reqDto.extras.length > 0) {
        await this.extrasService.updateForProduct(productId, reqDto.extras, tx);
      }

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
}
