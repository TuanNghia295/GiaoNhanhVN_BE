import { CreateLocationReqDto } from '@/api/locations/dto/create-location.req.dto';
import { GenderEnum } from '@/database/schemas';
import {
  BooleanFieldOptional,
  ClassFieldOptional,
  DateFieldOptional,
  EmailFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
  PasswordFieldOptional,
  StringFieldOptional,
} from 'src/decorators/field.decorators';

export class UpdateDeliverReqDto {
  @StringFieldOptional()
  phone?: string;

  @StringFieldOptional()
  fullName?: string;

  @PasswordFieldOptional()
  password?: string;

  @EmailFieldOptional()
  email?: string;

  @EnumFieldOptional(() => GenderEnum)
  gender?: GenderEnum;

  @ClassFieldOptional(() => CreateLocationReqDto)
  location?: CreateLocationReqDto;

  @DateFieldOptional()
  dateOfBirth?: Date;

  @BooleanFieldOptional()
  activated?: boolean;

  @StringFieldOptional()
  idCard: string;

  @BooleanFieldOptional()
  status: boolean;

  @NumberFieldOptional()
  point: number;
}
