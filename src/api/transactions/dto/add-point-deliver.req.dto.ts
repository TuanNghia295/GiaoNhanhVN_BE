import { TransactionTypeEnum } from '@/database/schemas';
import { EnumField, NumberField } from '@/decorators/field.decorators';

export class AddPointDeliverReqDto {
  @NumberField()
  deliverId: number;

  @NumberField()
  point: number;

  @EnumField(() => TransactionTypeEnum)
  type: TransactionTypeEnum;
}
