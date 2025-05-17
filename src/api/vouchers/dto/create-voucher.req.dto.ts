import {
  BooleanFieldOptional,
  DateField,
  NumberField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from 'src/decorators/field.decorators';

export class CreateVoucherReqDto {
  @StringField()
  code: string;

  @NumberField()
  value: number;

  @DateField()
  startDate: Date;

  @DateField()
  endDate: Date;

  @NumberField()
  maxUses: number;

  @NumberField()
  usePerUser: number;

  @StringFieldOptional()
  description: string;

  @NumberFieldOptional()
  areaId: number;

  @BooleanFieldOptional()
  isHidden?: boolean;

  @NumberFieldOptional()
  minOrderValue?: number;

  @NumberFieldOptional()
  maxOrderValue?: number;
}
