import {
  NumberField,
  PasswordField,
  StringField,
} from '@/decorators/field.decorators';

export class CreateManagerReqDto {
  @StringField()
  username: string;

  @PasswordField({
    default: '123456',
  })
  password: string;

  @NumberField()
  areaId: number;

  @StringField()
  phone: string;
}
