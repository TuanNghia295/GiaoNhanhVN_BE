import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { NumberFieldOptional } from '@/decorators/field.decorators';

export class PageStoreManagerReqDto extends PageOptionsDto {
  @NumberFieldOptional()
  areaId?: number;
}
