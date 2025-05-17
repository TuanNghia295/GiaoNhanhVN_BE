import {
  BooleanFieldOptional,
  DateFieldOptional,
  NumberField,
  NumberFieldOptional,
} from '@/decorators/field.decorators';

export class UpdateSettingReqDto {
  @BooleanFieldOptional()
  openFullTime?: boolean;

  @DateFieldOptional()
  openTime?: Date;

  @DateFieldOptional()
  closeTime?: Date;

  @BooleanFieldOptional()
  isRain?: boolean;

  @BooleanFieldOptional()
  isNight?: boolean;

  @BooleanFieldOptional()
  isHoliday?: boolean;

  @NumberFieldOptional()
  holidayPct?: number;

  @NumberFieldOptional()
  rainMorningPct?: number;

  @NumberFieldOptional()
  rainNightPct?: number;

  @NumberFieldOptional()
  nightFeePct?: number;

  @NumberField()
  id: number;
}
