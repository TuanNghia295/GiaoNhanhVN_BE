import { NumberFieldOptional, StringFieldOptional } from 'src/decorators/field.decorators';

export class SelectStoresReqDto {
  @StringFieldOptional()
  input?: string;

  @NumberFieldOptional()
  areaId?: number;
}
