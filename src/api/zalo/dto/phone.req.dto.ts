import { StringField } from '../../../decorators/field.decorators';

export class PhoneReqDto {
  @StringField()
  phone: string;
}
