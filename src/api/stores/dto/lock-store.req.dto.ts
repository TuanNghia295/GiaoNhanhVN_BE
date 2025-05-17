import { BooleanField, NumberField } from '@/decorators/field.decorators';

export class LockStoreReqDto {
  @NumberField()
  storeId: number;

  @BooleanField()
  isLocked: boolean;
}
