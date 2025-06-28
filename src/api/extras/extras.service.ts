import { CreateExtraReqDto } from '@/api/extras/dto/create-extra.req.dto';
import { DRIZZLE, Transaction } from '@/database/global';
import { extras } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class ExtrasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async createForProduct(
    productId: number,
    items: CreateExtraReqDto[],
    tx: Transaction,
  ): Promise<void> {
    await tx.insert(extras).values(
      items.map((item) => ({
        name: item.name,
        price: item.price,
        productId,
      })),
    );
  }

  async updateForProduct(
    productId: number,
    items: CreateExtraReqDto[],
    tx: Transaction,
  ): Promise<void> {
    // Xoá tất cả extras hiện tại cho productId
    await tx.update(extras).set({ productId: null }).where(eq(extras.productId, productId));

    // Thêm extras mới
    await this.createForProduct(productId, items, tx);
  }
}
