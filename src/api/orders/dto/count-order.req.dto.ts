import { OrderStatusEnum, OrderTypeEnum } from '@/database/schemas';
import {
  DateFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CountOrderReqDto {
  @StringFieldOptional()
  q?: string;

  @EnumFieldOptional(() => OrderStatusEnum)
  status?: OrderStatusEnum;

  @EnumFieldOptional(() => OrderTypeEnum)
  type?: OrderTypeEnum;

  @DateFieldOptional({
    default: new Date(new Date().setHours(0, 0, 0, 0)),
    nullable: true,
  })
  from?: Date;

  @DateFieldOptional({
    default: new Date(new Date().setHours(23, 59, 59, 999)),
    nullable: true,
  })
  to?: Date;

  @NumberFieldOptional()
  areaId?: number;
}
