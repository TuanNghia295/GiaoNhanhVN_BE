import { CreateOptionReqDto } from '@/api/options/dto/create-option.req.dto';
import { DRIZZLE, Transaction } from '@/database/global';
import { options } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';

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
}
