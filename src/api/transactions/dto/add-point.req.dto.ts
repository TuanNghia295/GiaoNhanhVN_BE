import { TransactionTypeEnum } from '@/database/schemas';
import { EnumField, NumberField } from '@/decorators/field.decorators';

export class AddPointReqDto {
  @NumberField()
  point: number;

  @NumberField()
  managerId: number;

  @EnumField(() => TransactionTypeEnum)
  type: TransactionTypeEnum;
}
