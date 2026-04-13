import { RoleEnum } from '@/database/schemas';
import {
  EnumField,
  NumberField,
  NumberFieldOptional,
  StringField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class LoginResDto {
  @NumberField()
  @Expose()
  userId!: number;

  @NumberFieldOptional()
  @Expose()
  areaId?: number;

  @StringField()
  @Expose()
  accessToken!: string;

  @StringField()
  @Expose()
  refreshToken!: string;

  @NumberField()
  @Expose()
  expires!: number;

  @EnumField(() => RoleEnum)
  @Expose()
  role!: RoleEnum;
}
