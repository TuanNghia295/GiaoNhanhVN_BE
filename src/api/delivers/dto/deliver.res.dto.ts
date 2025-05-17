import { GenderEnum } from '@/database/schemas';
import {
  BooleanField,
  ClassField,
  DateField,
  EnumField,
  NumberField,
  StringField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { LocationResDto } from '../../locations/dto/location.res.dto';

@Exclude()
export class DeliverResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  idCard: string;

  @StringField()
  @Expose()
  phone: string;

  @StringField()
  @Expose()
  fullName: string;

  @StringField()
  @Expose()
  email: string;

  @StringField()
  @Expose()
  avatar: string;

  @NumberField()
  @Expose()
  rating: number;

  @DateField()
  @Expose()
  dateOfBirth: Date;

  @EnumField(() => GenderEnum)
  @Expose()
  gender: GenderEnum;

  @ClassField(() => LocationResDto)
  @Expose()
  location: LocationResDto;

  @NumberField()
  @Expose()
  point: number;

  @NumberField()
  @Expose()
  orderCountInDay: number;

  @NumberField()
  @Expose()
  incomeInDay: number;

  @BooleanField()
  @Expose()
  status: boolean;

  @BooleanField()
  @Expose()
  activated: boolean;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;

  // @ClassField(() => BankAccountResDto)
  // @Expose()
  // banks: BankAccountResDto[];

  @NumberField()
  @Expose()
  areaId: number;
}
