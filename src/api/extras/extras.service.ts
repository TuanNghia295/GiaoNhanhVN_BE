import { CreateExtraReqDto } from '@/api/extras/dto/create-extra.req.dto';
import { UpdateExtraReqDto } from '@/api/extras/dto/update-extra.req.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, Transaction } from '@/database/global';
import { extras } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
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
    if (items.length > 0) {
      await this.createForProduct(productId, items, tx);
    }
  }

  async updateById(extraId: number, reqDto: UpdateExtraReqDto) {
    if (!(await this.existsById(extraId))) {
      throw new ValidationException(ErrorCode.E001);
    }

    return this.db
      .update(extras)
      .set({
        ...reqDto,
      })
      .where(eq(extras.id, extraId))
      .returning();
  }

  async existsById(extraId: number) {
    return this.db.query.extras.findFirst({
      where: eq(extras.id, extraId),
      columns: { id: true },
    });
  }
}
