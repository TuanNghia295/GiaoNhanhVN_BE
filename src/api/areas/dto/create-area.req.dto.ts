import { StringField } from '@/decorators/field.decorators';

export class CreateAreaReqDto {
  @StringField()
  name: string;

  @StringField()
  parent: string;

  @StringField()
  code: string;
}
