import { OrderTypeEnum } from '@/database/schemas';
import { Exclude, Expose } from 'class-transformer';
import { WrapperType } from 'src/common/types/types';
import { AbstractResDto } from 'src/database/dto/abstract.res.dto';
import {
  ClassField,
  EnumField,
  NumberField,
} from 'src/decorators/field.decorators';
import { DistanceSettingResDto } from './distance-setting.res.dto';

@Exclude()
export class ServiceFeeResDto extends AbstractResDto {
  @EnumField(() => OrderTypeEnum)
  @Expose()
  type: OrderTypeEnum;

  @NumberField()
  @Expose()
  price: number;

  @NumberField()
  @Expose()
  pricePct: number;

  @NumberField()
  @Expose()
  userServiceFee: number;

  @NumberField()
  @Expose()
  userServiceFeePct: number;

  @NumberField()
  @Expose()
  deliverFee: number;

  @NumberField()
  @Expose()
  deliverFeePct: number;

  @NumberField()
  @Expose()
  distancePct: number;

  @NumberField()
  @Expose()
  settingId: number;

  @ClassField(() => DistanceSettingResDto)
  @Expose()
  distance: WrapperType<DistanceSettingResDto>[];
}
