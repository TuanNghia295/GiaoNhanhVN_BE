import { NumberField, NumberFieldOptional, StringField } from '@/decorators/field.decorators';

export class CreateDeliveryRegionsReqDto {
  @StringField()
  name: string;

  @NumberField()
  price: number;

  @NumberFieldOptional()
  areaId?: number;
}
