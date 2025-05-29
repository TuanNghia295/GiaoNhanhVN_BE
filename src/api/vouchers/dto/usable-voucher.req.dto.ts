import {
  BooleanFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class UsableVoucherReqDto {
  @NumberFieldOptional()
  storeId?: number;

  @NumberFieldOptional()
  areaId?: number;

  @BooleanFieldOptional()
  isHidden?: boolean;

  @StringFieldOptional()
  code: string;
}
