import { UserResDto } from '@/api/users/dto/user.res.dto';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import {
  BooleanField,
  ClassField,
  DateField,
  NumberField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class StoreResDto extends AbstractResDto {
  @StringField()
  @Expose()
  name: string;

  @StringField()
  @Expose()
  description: string;

  @NumberField()
  @Expose()
  rating: number;

  @StringField()
  @Expose()
  address: string;

  @StringField()
  @Expose()
  background: string;

  @StringField()
  @Expose()
  location: string;

  @StringField()
  @Expose()
  avatar: string;

  @StringFieldOptional()
  @Expose()
  distance: string;

  @DateField()
  @Expose()
  openTime: Date;

  @DateField()
  @Expose()
  closeTime: Date;

  @DateField()
  @Expose()
  openSecondTime: Date;

  @DateField()
  @Expose()
  closeSecondTime: Date;

  @BooleanField()
  @Expose()
  isLocked: boolean;

  @BooleanField()
  @Expose()
  status: boolean;

  @NumberField()
  @Expose()
  areaId: number;

  @ClassField(() => UserResDto)
  @Expose()
  user: UserResDto;
}
