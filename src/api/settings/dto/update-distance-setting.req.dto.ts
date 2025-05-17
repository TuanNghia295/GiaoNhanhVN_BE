import { NumberFieldOptional } from 'src/decorators/field.decorators';

export class UpdateDistanceSettingReqDto {
  @NumberFieldOptional()
  id: number;

  @NumberFieldOptional()
  minDistance: number;

  @NumberFieldOptional()
  maxDistance: number;

  @NumberFieldOptional()
  rate: number;
}
