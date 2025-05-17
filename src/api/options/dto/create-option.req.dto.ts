import { NumberField, StringField } from '@/decorators/field.decorators';

export class CreateOptionReqDto {
  @StringField()
  name: string;

  @NumberField()
  price: number;
}
