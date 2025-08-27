import { NumberField } from '@/decorators/field.decorators';

export class ConvertUserToStoreFunctionReqDto {
  @NumberField()
  userId!: number;

  @NumberField()
  areaId!: number;
}
