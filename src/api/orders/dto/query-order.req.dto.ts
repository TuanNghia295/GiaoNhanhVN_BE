import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import {
  OrderStatusEnum,
  OrderTypeEnum,
} from '@/database/schemas/order.schema';
import {
  DateFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
} from '@/decorators/field.decorators';

export class PageOrderReqDto extends PageOptionsDto {
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
