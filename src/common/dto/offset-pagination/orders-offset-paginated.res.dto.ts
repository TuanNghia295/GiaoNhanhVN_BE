import { OrderResDto } from '@/api/orders/dto/order.res.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { NumberField } from '@/decorators/field.decorators';
import { OffsetPaginatedDto } from 'src/common/dto/offset-pagination/paginated.dto';

export class OrdersOffsetPaginatedResDto extends OffsetPaginatedDto<OrderResDto> {
  @NumberField()
  totalOrders: number;

  @NumberField()
  totalOrdersPending: number;

  @NumberField()
  totalOrdersAccepted: number;

  @NumberField()
  totalOrdersDelivering: number;

  @NumberField()
  totalOrdersDelivered: number;

  @NumberField()
  totalOrdersCancelled: number;

  constructor(
    data: OrderResDto[],
    meta: OffsetPaginationDto,
    totalOrders?: TOTAL_ORDERS_FOR_PAGINATED,
  ) {
    super(data, meta);
    this.totalOrders = totalOrders?.totalOrders;
    this.totalOrdersPending = totalOrders?.totalOrdersPending;
    this.totalOrdersAccepted = totalOrders?.totalOrdersAccepted;
    this.totalOrdersDelivering = totalOrders?.totalOrdersDelivering;
    this.totalOrdersDelivered = totalOrders?.totalOrdersDelivered;
    this.totalOrdersCancelled = totalOrders?.totalOrdersCancelled;
  }
}

export interface TOTAL_ORDERS_FOR_PAGINATED {
  totalOrders: number;
  totalOrdersPending: number;
  totalOrdersAccepted: number;
  totalOrdersDelivering: number;
  totalOrdersDelivered: number;
  totalOrdersCancelled: number;
}
