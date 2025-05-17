import { OrderStatusEnum } from '@/database/schemas';
import { EnumField } from '@/decorators/field.decorators';

export class UpdateStatusOrderReqDto {
  @EnumField(() => OrderStatusEnum)
  status: OrderStatusEnum;
}
