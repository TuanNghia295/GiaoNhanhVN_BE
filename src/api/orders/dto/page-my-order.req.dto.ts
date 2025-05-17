import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { OrderStatusEnum, OrderTypeEnum } from '@/database/schemas';
import { EnumArrayFieldOptional } from 'src/decorators/field.decorators';

export class PageMyOrderReqDto extends PageOptionsDto {
  @EnumArrayFieldOptional(() => OrderTypeEnum, {
    isArray: true,
  })
  type: OrderTypeEnum[];

  @EnumArrayFieldOptional(() => OrderStatusEnum)
  status: OrderStatusEnum[];
}
