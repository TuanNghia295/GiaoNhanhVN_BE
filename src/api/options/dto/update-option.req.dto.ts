import { NumberFieldOptional, StringFieldOptional } from '@/decorators/field.decorators';

export class UpdateOptionReqDto {
  @StringFieldOptional()
  name?: string;

  @NumberFieldOptional()
  price?: number;
}
