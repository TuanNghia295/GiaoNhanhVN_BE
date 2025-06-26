import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { RoleEnum } from '@/database/schemas';
import {
  BooleanField,
  DateField,
  EmailField,
  EnumField,
  NumberField,
  StringField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResDto extends AbstractResDto {
  @StringField()
  @Expose()
  phone: string;

  @EmailField()
  @Expose()
  email: string;

  @StringField()
  @Expose()
  fullName: string;

  @StringField()
  @Expose()
  provider: string;

  @EnumField(() => RoleEnum)
  @Expose()
  role: RoleEnum;

  @StringField()
  @Expose()
  avatar: string;

  @DateField()
  @Expose()
  dateOfBirth: Date;

  @BooleanField()
  @Expose()
  isLocked: boolean;

  @NumberField()
  @Expose()
  count: number;

  @NumberField()
  @Expose()
  areaId: number;

  @NumberField()
  @Expose()
  coin: number;

  @StringField()
  @Expose()
  gender: string;

  // @ClassFieldOptional(() => LocationResDto)
  // @Expose()
  // addresses: WrapperType<LocationResDto[]>;
}
