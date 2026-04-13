import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { VouchersTypeEnum } from '@/database/schemas';
import {
  BooleanFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from 'src/decorators/field.decorators';

export class PageVouchersReqDto extends PageOptionsDto {
  @EnumFieldOptional(() => VouchersTypeEnum)
  type?: VouchersTypeEnum;

  // Phân biệt đâu là voucher cho ứng dụng, đâu là voucher cho cửa hàng
  @BooleanFieldOptional()
  isApp: boolean;

  @StringFieldOptional()
  storeInput?: string;

  @NumberFieldOptional()
  areaId?: number;
}
