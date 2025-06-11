import { Expose } from 'class-transformer';
import {
  ClassField,
  NumberField,
  StringField,
} from 'src/decorators/field.decorators';

export class StoreRevenueItemDto {
  @StringField()
  @Expose()
  status: string;

  @NumberField()
  @Expose()
  total_order: number;

  @NumberField()
  @Expose()
  total_product_price: number;

  @StringField()
  @Expose()
  total_store_service_fee: string;

  @StringField()
  @Expose()
  total_voucher_value: string;

  @StringField()
  @Expose()
  total_store_revenue: string;
}

export class StoreRevenueResDto {
  @ClassField(() => StoreRevenueItemDto)
  @Expose()
  all: StoreRevenueItemDto;

  @NumberField()
  @Expose()
  total_all_order: number;

  @NumberField()
  @Expose()
  total_all_product_price: number;

  @NumberField()
  @Expose()
  total_all_store_service_fee: number;

  @NumberField()
  @Expose()
  total_all_voucher_value: number;

  @NumberField()
  @Expose()
  total_all_store_revenue: number;
}
