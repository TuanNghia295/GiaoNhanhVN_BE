import { NumberField } from '@/decorators/field.decorators';

export class UpdateShopDistanceReqDto {
  @NumberField()
  numberStores: number | null;

  @NumberField()
  numberRadius: number | null;
}
