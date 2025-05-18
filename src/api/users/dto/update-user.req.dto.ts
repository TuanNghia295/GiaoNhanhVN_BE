import { GenderEnum } from '@/database/schemas';
import {
  DateFieldOptional,
  EmailFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class UpdateUserReqDto {
  @StringFieldOptional()
  fullName: string;

  @EmailFieldOptional({
    default: 'sting@gmail.com',
  })
  email: string;

  @DateFieldOptional({
    default: new Date(),
  })
  dateOfBirth: Date;

  @EnumFieldOptional(() => GenderEnum)
  gender: GenderEnum;

  @StringFieldOptional()
  fcmToken: string;

  @StringFieldOptional()
  province?: string;

  @StringFieldOptional()
  parent?: string;

  @NumberFieldOptional()
  areaId: number;
}
