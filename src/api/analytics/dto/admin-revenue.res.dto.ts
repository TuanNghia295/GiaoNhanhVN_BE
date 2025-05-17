import { Expose } from 'class-transformer';
import {
  ClassField,
  NumberField,
  StringField,
} from 'src/decorators/field.decorators';

export class OrderStatusRevenueResDto {
  @StringField()
  @Expose()
  status: string;

  @NumberField()
  @Expose()
  total_order: number;

  @StringField()
  @Expose()
  total_product_price: string;

  @StringField()
  @Expose()
  total_user_payment: string;

  @StringField()
  @Expose()
  total_store_service_fee: string;

  @StringField()
  @Expose()
  total_deliver_service_fee: string;

  @StringField()
  @Expose()
  total_voucher_value: string;

  @StringField()
  @Expose()
  total_app_revenue: string;
}

export class AdminRevenueResDto {
  @ClassField(() => OrderStatusRevenueResDto)
  @Expose()
  all: OrderStatusRevenueResDto;

  @NumberField()
  @Expose()
  total_all_order: number;

  @NumberField()
  @Expose()
  total_all_product_price: number;

  @NumberField()
  @Expose()
  total_all_user_payment: number;

  @NumberField()
  @Expose()
  total_all_store_service_fee: number;

  @NumberField()
  @Expose()
  total_all_deliver_service_fee: number;

  @NumberField()
  @Expose()
  total_all_voucher_value: number;

  @NumberField()
  @Expose()
  total_all_app_revenue: number;
}
