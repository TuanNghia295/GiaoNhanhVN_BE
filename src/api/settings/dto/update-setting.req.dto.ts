import {
  BooleanFieldOptional,
  DateFieldOptional,
  NumberField,
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class UpdateSettingReqDto {
  @BooleanFieldOptional()
  openFullTime?: boolean;

  @DateFieldOptional()
  startNightTime?: Date;

  @DateFieldOptional()
  endNightTime?: Date;

  @BooleanFieldOptional()
  isRain?: boolean;

  @BooleanFieldOptional()
  isNight?: boolean;

  @StringFieldOptional()
  hotline?: string;

  @StringFieldOptional()
  fanpage?: string;

  @NumberFieldOptional()
  nightFee?: number;

  @NumberFieldOptional()
  rainFee?: number;

  @NumberField()
  id: number;
}
