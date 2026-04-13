import {
  BooleanFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from 'src/decorators/field.decorators';

export class QueryGetVoucherForUseReqDto {
  @NumberFieldOptional()
  storeId: number;

  @NumberFieldOptional()
  areaId: number;

  @BooleanFieldOptional()
  isHidden?: boolean;

  @StringFieldOptional()
  code?: string;
}
