import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import {
  BooleanField,
  DateField,
  NumberField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SettingResDto extends AbstractResDto {
  @BooleanField()
  @Expose()
  openFullTime: boolean;

  @DateField()
  @Expose()
  openTime: Date;

  @DateField()
  @Expose()
  closeTime: Date;

  @BooleanField()
  @Expose()
  isRain: boolean;

  @BooleanField()
  @Expose()
  isNight: boolean;

  @BooleanField()
  @Expose()
  isHoliday: boolean;

  @NumberField()
  @Expose()
  pctHoliday: number;

  @NumberField()
  @Expose()
  pctRain: number;

  @NumberField()
  @Expose()
  pctNight: number;

  @NumberField()
  @Expose()
  pctRainNight: number;
}
