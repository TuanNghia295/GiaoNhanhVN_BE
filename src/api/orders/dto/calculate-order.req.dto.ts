import { OrderTypeEnum } from '@/database/schemas';
import {
  EnumField,
  NumberFieldOptional,
  StringField,
} from '@/decorators/field.decorators';
import { VehicleType } from '@/shared/goong.service';

export class CalculateOrderReqDto {
  @NumberFieldOptional()
  areaId?: number;

  @EnumField(() => VehicleType)
  vehicle: VehicleType;

  @EnumField(() => OrderTypeEnum)
  orderType: OrderTypeEnum;

  @StringField({
    example: '10.782418, 106.695635',
  })
  origins: string;

  @StringField({
    example: '10.782418, 106.695635',
  })
  destinations: string;
}
