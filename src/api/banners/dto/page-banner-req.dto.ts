import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { BannerEnum } from '@/database/schemas';
import { EnumFieldOptional, NumberFieldOptional } from 'src/decorators/field.decorators';

export class PageBannerReqDto extends PageOptionsDto {
  @EnumFieldOptional(() => BannerEnum)
  type?: BannerEnum;

  @NumberFieldOptional()
  areaId: number;
}
