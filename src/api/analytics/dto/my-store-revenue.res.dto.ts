import { NumberField } from '../../../decorators/field.decorators';

export class MyStoreRevenueResDto {
  @NumberField()
  total_orders: number;

  @NumberField()
  total_revenue: number;
}
