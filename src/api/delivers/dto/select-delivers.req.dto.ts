import { NumberFieldOptional, StringFieldOptional } from 'src/decorators/field.decorators';

export class SelectDeliversReqDto {
  @StringFieldOptional()
  input?: string;

  @NumberFieldOptional()
  areaId?: number;
}
