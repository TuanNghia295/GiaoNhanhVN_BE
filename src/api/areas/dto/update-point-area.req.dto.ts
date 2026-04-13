import { NumberField } from '../../../decorators/field.decorators';

export class UpdatePointAreaReqDto {
  @NumberField()
  areaId: string;

  @NumberField()
  point: number;
}
