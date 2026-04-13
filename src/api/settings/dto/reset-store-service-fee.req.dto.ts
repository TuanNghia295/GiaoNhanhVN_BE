import { NumberField } from '@/decorators/field.decorators';

export class ResetStoreServiceFeeReqDto {
  @NumberField()
  areaId: number;
}
