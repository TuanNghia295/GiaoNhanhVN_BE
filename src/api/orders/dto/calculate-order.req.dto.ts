import { OrderTypeEnum } from '@/database/schemas';
import { EnumField, NumberFieldOptional, StringFieldOptional } from '@/decorators/field.decorators';
import { VehicleType } from '@/shared/goong.service';

export class CalculateOrderReqDto {
  @NumberFieldOptional()
  areaId?: number;

  @EnumField(() => VehicleType)
  vehicle: VehicleType;

  @EnumField(() => OrderTypeEnum)
  orderType: OrderTypeEnum;

  @StringFieldOptional({
    example: '10.782418, 106.695635',
  })
  origins?: string;

  @StringFieldOptional({
    example: '10.782418, 106.695635',
  })
  destinations?: string;

  @NumberFieldOptional()
  deliveryRegionId?: number;

  @StringFieldOptional()
  parent?: string;

  @StringFieldOptional()
  name?: string;
}
