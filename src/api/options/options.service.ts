import { CreateOptionReqDto } from '@/api/options/dto/create-option.req.dto';
import { DRIZZLE, Transaction } from '@/database/global';
import { options } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class OptionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async createForProduct(
    productId: number,
    items: CreateOptionReqDto[],
    tx: Transaction,
  ): Promise<void> {
    await tx
      .insert(options)
      .values(
        items.map((option) => ({
          productId: productId,
          name: option.name,
          price: option.price,
        })),
      )
      .execute();
  }

  async updateForProduct(
    productId: number,
    items: CreateOptionReqDto[],
    tx: Transaction,
  ): Promise<void> {
    // Xoá tất cả các tuỳ chọn hiện tại của sản phẩm
    await tx
      .update(options)
      .set({ productId: null })
      .where(eq(options.productId, productId))
      .execute();

    // Thêm options mới
    if (items.length > 0) {
      await this.createForProduct(productId, items, tx);
    }
  }
}
