import { NumberFieldOptional, PasswordField, StringField } from '@/decorators/field.decorators';

export class CreateUserReqDto {
  @StringField()
  phone!: string;

  @PasswordField()
  password!: string;

  @NumberFieldOptional()
  areaId?: number;
}
