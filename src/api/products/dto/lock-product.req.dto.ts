import { BooleanField } from '@/decorators/field.decorators';

export class LockProductReqDto {
  @BooleanField()
  isLocked: boolean;
}
