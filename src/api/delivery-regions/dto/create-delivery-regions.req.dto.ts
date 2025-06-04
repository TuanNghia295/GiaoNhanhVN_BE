import { NumberField, StringField } from '@/decorators/field.decorators';

export class CreateDeliveryRegionsReqDto {
  @StringField()
  name: string;

  @NumberField()
  price: number;
}
