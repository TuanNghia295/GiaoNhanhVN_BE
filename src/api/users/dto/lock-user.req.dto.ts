import { BooleanField, NumberField } from '@/decorators/field.decorators';

export class LockUserReqDto {
  @NumberField()
  userId: number;

  @BooleanField()
  isLocked: boolean;
}
