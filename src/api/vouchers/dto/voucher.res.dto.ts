import { VouchersStatusEnum, VouchersTypeEnum } from '@/database/schemas';
import { Exclude, Expose } from 'class-transformer';
import { AbstractResDto } from 'src/database/dto/abstract.res.dto';
import {
  DateField,
  EnumField,
  NumberField,
  StringField,
  StringFieldOptional,
} from 'src/decorators/field.decorators';

@Exclude()
export class VoucherResDto extends AbstractResDto {
  @StringField()
  @Expose()
  code: string;

  @NumberField()
  @Expose()
  value: number;

  @EnumField(() => VouchersTypeEnum)
  @Expose()
  type: VouchersTypeEnum;

  @DateField()
  @Expose()
  startDate: Date;

  @DateField()
  @Expose()
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
  @Expose()
  description: string;

  @NumberField()
  @Expose()
  minOrderValue: number;

  @NumberField()
  @Expose()
  maxOrderValue: number;

  @EnumField(() => VouchersStatusEnum)
  @Expose()
  status: VouchersStatusEnum;
}
