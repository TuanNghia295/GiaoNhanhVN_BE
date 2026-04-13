import { PasswordField, StringField } from '@/decorators/field.decorators';

export class LoginManagerReqDto {
  @StringField({
    default: 'admin',
  })
  username!: string;

  @PasswordField({
    default: '123456',
  })
  password!: string;
}
