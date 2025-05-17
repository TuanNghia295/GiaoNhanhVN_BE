import { OrderDetailResDto } from '@/api/order-details/dto/order-detail.res.dto';
import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import {
  OrderStatusEnum,
  OrderTypeEnum,
} from '@/database/schemas/order.schema';
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
  isHoliday: boolean;

  @BooleanField()
  @Expose()
  isRain: boolean;

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

  @StringField()
  @Expose()
  addressTo: string;

  @StringField()
  @Expose()
  note: string;

  @ClassField(() => UserResDto)
  @Expose()
  user: UserResDto;

  // @ClassFieldOptional(() => StoreResDto)
  // @Expose()
  // store: StoreResDto;

  @ClassFieldOptional(() => OrderDetailResDto, { isArray: true })
  @Expose()
  orderDetails: WrapperType<OrderDetailResDto>[];

  // @ClassFieldOptional(() => DeliverResDto)
  // @Expose()
  // deliver: DeliverResDto;

  // @ClassFieldOptional(() => VoucherResDto, { isArray: true })
  // @Expose()
  // vouchers: WrapperType<VoucherResDto>[];

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
