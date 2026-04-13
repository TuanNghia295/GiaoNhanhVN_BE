import { NumberField } from 'src/decorators/field.decorators';

export class CreateStoreReqDto {
  @NumberField()
  areaId: number;
}
