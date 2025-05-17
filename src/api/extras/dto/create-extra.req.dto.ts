import { NumberField, StringField } from '@/decorators/field.decorators';

export class CreateExtraReqDto {
  @StringField()
  name: string;

  @NumberField()
  price: number;
}
