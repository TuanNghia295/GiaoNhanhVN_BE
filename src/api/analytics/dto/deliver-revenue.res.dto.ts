import { Expose } from 'class-transformer';
import {
  ClassField,
  NumberField,
  StringField,
} from 'src/decorators/field.decorators';

export class DeliverDetailResDto {
  @NumberField()
  id: number;

  @StringField()
  phone: string;

  @StringField()
  name: string;

  @NumberField()
  total_orders: number;

  @NumberField()
  total_order_delivered: number;

  @NumberField()
  total_order_not_take: number;

  @NumberField()
  total_order_canceled: number;

  @StringField()
  total_income: string;

  @NumberField()
  @Expose()
  point: number;
}

export class DeliverRevenueResDto {
  @ClassField(() => DeliverDetailResDto)
  data: DeliverDetailResDto[];

  @NumberField()
  @Expose()
  total_all_income: number;

  @NumberField()
  @Expose()
  total_all_orders: number;

  @NumberField()
  @Expose()
  total_all_order_delivered: number;

  @NumberField()
  @Expose()
  total_all_order_canceled: number;

  @NumberField()
  @Expose()
  total_all_deliver_point: number;
}
