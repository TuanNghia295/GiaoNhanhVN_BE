import { NumberFieldOptional } from 'src/decorators/field.decorators';

export class GetBannerReqDto {
  @NumberFieldOptional()
  areaId: number;
}
