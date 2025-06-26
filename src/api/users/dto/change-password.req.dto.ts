import { StringField } from '@/decorators/field.decorators';

export class ChangePasswordReqDto {
  @StringField()
  oldPassword: string;

  @StringField()
  newPassword: string;
}
