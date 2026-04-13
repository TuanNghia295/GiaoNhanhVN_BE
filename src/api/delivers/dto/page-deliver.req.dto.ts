import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { NumberFieldOptional } from '@/decorators/field.decorators';

export class PageDeliverReqDto extends PageOptionsDto {
  @NumberFieldOptional()
  areaId?: number;
}
