import { VouchersStatusEnum, VouchersTypeEnum } from '@/database/schemas';
import { Expose } from 'class-transformer';
import { AbstractResDto } from 'src/database/dto/abstract.res.dto';
import {
  DateField,
  EnumField,
  NumberField,
  StringField,
  StringFieldOptional,
} from 'src/decorators/field.decorators';

export class VoucherResDto extends AbstractResDto {
  @StringField()
  code: string;

  @NumberField()
  @Expose()
  value: number;

  @EnumField(() => VouchersTypeEnum)
  type: VouchersTypeEnum;

  @DateField()
  startDate: Date;

  @DateField()
  endDate: Date;

  @NumberField()
  @Expose()
  maxUses: number;

  @NumberField()
  @Expose()
  usePerUser: number;

  @NumberField()
  @Expose()
  usedCount: number;

  @StringFieldOptional()
  description: string;

  @NumberField()
  @Expose()
  minOrderValue: number;

  @NumberField()
  @Expose()
  maxOrderValue: number;

  @EnumField(() => VouchersStatusEnum)
  status: VouchersStatusEnum;
}
