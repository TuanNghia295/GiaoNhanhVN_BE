import {
  PasswordField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class LoginReqDto {
  @StringField()
  phone!: string;

  @PasswordField()
  password!: string;

  @StringFieldOptional()
  fcmToken?: string;
}
