import { NumberFieldOptional, StringFieldOptional } from '@/decorators/field.decorators';

export class UpdateExtraReqDto {
  @StringFieldOptional()
  name?: string;

  @NumberFieldOptional()
  price?: number;
}
