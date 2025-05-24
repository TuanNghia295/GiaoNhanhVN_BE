import { TransactionTypeEnum } from '@/database/schemas';
import { EnumField, NumberField } from '@/decorators/field.decorators';

export class CreateTransactionReqDto {
  @EnumField(() => TransactionTypeEnum)
  type: TransactionTypeEnum;

  @NumberField()
  amount: number;
}
