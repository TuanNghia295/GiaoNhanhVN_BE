import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { VouchersTypeEnum } from '@/database/schemas';
import {
  EnumField,
  NumberFieldOptional,
  StringFieldOptional,
} from 'src/decorators/field.decorators';

export class PageVouchersReqDto extends PageOptionsDto {
  @EnumField(() => VouchersTypeEnum)
  type: VouchersTypeEnum;

  @StringFieldOptional()
  storeInput?: string;

  @NumberFieldOptional()
  areaId?: number;
}
