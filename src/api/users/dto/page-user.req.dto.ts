import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { NumberFieldOptional } from '@/decorators/field.decorators';

export class PageUserReqDto extends PageOptionsDto {
  @NumberFieldOptional({
    int: true,
  })
  readonly areaId?: number;
}
