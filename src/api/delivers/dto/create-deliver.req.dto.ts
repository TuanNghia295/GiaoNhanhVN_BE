import { GenderEnum } from '@/database/schemas';
import { IsNumberString } from 'class-validator';
import {
  EnumField,
  NumberField,
  PasswordField,
  StringField,
} from 'src/decorators/field.decorators';

export class CreateDeliverReqDto {
  @StringField()
  @IsNumberString()
  idCard: string;

  @StringField()
  phone: string;

  @StringField()
  fullName: string;

  @PasswordField()
  password: string;

  @NumberField()
  areaId: number;

  @EnumField(() => GenderEnum)
  gender: GenderEnum;
}
