import { CreateExtraReqDto } from '@/api/extras/dto/create-extra.req.dto';
import { DRIZZLE, Transaction } from '@/database/global';
import { extras } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';

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
}
