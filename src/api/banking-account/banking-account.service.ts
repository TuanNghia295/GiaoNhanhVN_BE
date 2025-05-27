import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { banks } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class BankingAccountService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getBankByAuthorId(authorId: number) {
    const [bank] = await this.db
      .select()
      .from(banks)
      .where(eq(banks.authorId, authorId));
    if (!bank) {
      throw new ValidationException(ErrorCode.BK001);
    }
    return bank;
  }
}
