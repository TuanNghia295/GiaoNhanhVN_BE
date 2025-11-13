import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { NumberFieldOptional } from '@/decorators/field.decorators';

export class PageProductReqDto extends PageOptionsDto {
  @NumberFieldOptional()
  storeId?: number;

  @NumberFieldOptional()
  categoryItemId?: number;

  @NumberFieldOptional()
  storeMenuId?: number;
}
