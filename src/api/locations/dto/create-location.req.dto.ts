import { StringField } from '@/decorators/field.decorators';

export class CreateLocationReqDto {
  @StringField()
  address!: string;

  @StringField()
  geometry!: string;

  @StringField()
  province!: string;
}
