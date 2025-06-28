import { DeliverResDto } from '@/api/delivers/dto/deliver.res.dto';
import { OrderDetailResDto } from '@/api/order-details/dto/order-detail.res.dto';
import { StoreResDto } from '@/api/stores/dto/store.res.dto';
import { VoucherResDto } from '@/api/vouchers/dto/voucher.res.dto';
import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { OrderStatusEnum, OrderTypeEnum } from '@/database/schemas/order.schema';
import {
  BooleanField,
  ClassField,
  ClassFieldOptional,
  EnumField,
  NumberField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { UserResDto } from '../../users/dto/user.res.dto';

@Exclude()
class ReasonDeliverCancelOrder {
  @StringField()
  @Expose()
  reason: string;
}

@Exclude()
export class OrderResDto extends AbstractResDto {
  @StringField()
  @Expose()
  code: string;

  @EnumField(() => OrderStatusEnum)
  @Expose()
  status: OrderStatusEnum;

  @EnumField(() => OrderTypeEnum)
  @Expose()
  type: OrderTypeEnum;

  @BooleanField()
  @Expose()
  isRain: boolean;

  @BooleanField()
  @Expose()
  isNight: boolean;

  @NumberField()
  @Expose()
  rainFee: number;

  @NumberField()
  @Expose()
  nightFee: number;

  @NumberField()
  @Expose()
  distance: number;

  @NumberField()
  @Expose()
  totalDelivery: number;

  @NumberField()
  @Expose()
  totalProduct: number;

  @NumberField()
  @Expose()
  totalProductTax: number;

  @NumberField()
  @Expose()
  deliveryIncomeTax: number;

  @NumberField()
  @Expose()
  total: number;

  @NumberField()
  @Expose()
  userServiceFee: number;

  @NumberField()
  @Expose()
  storeServiceFee: number;

  @NumberField()
  @Expose()
  incomeDeliver: number;

  @NumberField()
  @Expose()
  payforShop: number;

  @StringField()
  @Expose()
  addressFrom: string;

  @BooleanField()
  @Expose()
  isRated: boolean;

  @StringField()
  @Expose()
  addressTo: string;

  @StringField()
  @Expose()
  note: string;

  @ClassField(() => UserResDto)
  @Expose()
  user: UserResDto;

  @ClassFieldOptional(() => StoreResDto)
  @Expose()
  store: StoreResDto;

  @ClassFieldOptional(() => OrderDetailResDto)
  @Expose()
  orderDetails: WrapperType<OrderDetailResDto>[];

  @ClassFieldOptional(() => DeliverResDto)
  @Expose()
  deliver: DeliverResDto;

  @ClassFieldOptional(() => ReasonDeliverCancelOrder)
  @Expose()
  reasonDeliverCancelOrder: WrapperType<ReasonDeliverCancelOrder>[];

  @ClassFieldOptional(() => VoucherResDto)
  @Expose()
  vouchers: WrapperType<VoucherResDto>[];

  @NumberField()
  @Expose()
  totalVoucher: number;

  @StringFieldOptional()
  @Expose()
  nameForContact?: string;

  @StringFieldOptional()
  @Expose()
  phoneForContact?: string;
}
