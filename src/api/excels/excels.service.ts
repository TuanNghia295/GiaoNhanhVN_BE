import { ProductsService } from '@/api/products/products.service';
import { StoresService } from '@/api/stores/stores.service';
import { ImportHeaderKeys, ImportHeaderLabels } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import {
  categoryItems,
  extras,
  options,
  products,
  storeMenus,
} from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export type ParsedProductRow = Partial<Record<ImportHeaderKeys, string>>;
export const ImportProductHeaderMap: Record<string, ImportHeaderKeys> =
  Object.entries(ImportHeaderLabels).reduce(
    (acc, [key, label]) => {
      acc[label] = key as ImportHeaderKeys;
      return acc;
    },
    {} as Record<string, ImportHeaderKeys>,
  );

@Injectable()
export class ExcelsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly productsService: ProductsService,
    private readonly storesService: StoresService, // Replace with actual type
  ) {}

  async importProduct(file: Express.Multer.File) {
    const buffer = file.buffer;
    const result = await this.parseExcelBufferToData(buffer);

    for (const row of result) {
      //--------------------------------------------------
      // Kiểm tra xem sản phẩm đã tồn tại hay chưa
      //--------------------------------------------------
      const existStore = await this.storesService.existByUserPhone(
        row.storePhone,
      );
      if (!existStore) {
        console.log('Store not found:', row.storePhone);
        continue; // Skip this row if store does not exist
      }

      //--------------------------------------------------
      // Tạo mới sản phẩm
      //--------------------------------------------------
      await this.db.transaction(async (tx) => {
        const [existStoreMenu] = await this.db
          .select({
            id: storeMenus.id,
          })
          .from(storeMenus)
          .where(
            and(
              eq(storeMenus.storeId, existStore.storeId),
              eq(storeMenus.name, row.menuName),
            ),
          );
        if (!existStoreMenu) {
          console.log('Store menu not found:', row.menuName);
          return; // Skip this row if store menu does not exist
        }

        const [categoryItem] = await this.db
          .select({
            id: categoryItems.id,
          })
          .from(categoryItems)
          .where(and(eq(categoryItems.name, row.categoryName)));
        if (!categoryItem) {
          console.log('Category item not found:', row.categoryName);
          return; // Skip this row if category item does not exist
        }

        console.log('Creating product:', row);
        const [createdProduct] = await tx
          .insert(products)
          .values({
            name: row.productName,
            price: +row.basePrice || 0,
            storeId: existStore.storeId,
            description: row.description,
            storeMenuId: existStoreMenu.id,
            categoryItemId: categoryItem.id,
          })
          .returning();

        // console.log('Created product:', createdProduct);
        if (Array.isArray(row.toppings) && Array.isArray(row.toppingPrices)) {
          if (row.toppings.length !== row.toppingPrices.length) {
            throw new ValidationException(ErrorCode.EX001);
          }
          const extraValues = row.toppings.map((topping, idx) => ({
            name: topping.trim(),
            price: Number(row.toppingPrices[idx]),
            productId: createdProduct.id,
          }));
          await tx.insert(extras).values(extraValues).returning();
          console.log('Created extras:', extraValues);
        }

        if (Array.isArray(row.sizes) && Array.isArray(row.sizePrices)) {
          if (row.sizes.length !== row.sizePrices.length) {
            throw new ValidationException(ErrorCode.EX001);
          }
          const optionValues = row.sizes.map((topping, idx) => ({
            name: topping.trim(),
            price: Number(row.toppingPrices[idx]),
            productId: createdProduct.id,
          }));

          await tx.insert(options).values(optionValues).returning();

          console.log('Created options:', optionValues);
        }
      });
    }
    return result;
  }

  async parseExcelBufferToData(buffer: Buffer): Promise<ParsedProductRow[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
    });
    const headers = jsonData[0] as string[];
    return jsonData
      .slice(1)
      .filter((row: string[]) => row.length > 0)
      .map((row: string[]) => {
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          const key = ImportProductHeaderMap[header];
          rowData[key] = row[index];
        });
        return rowData;
      });
  }
}
