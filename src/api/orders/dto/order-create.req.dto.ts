import { OrderTypeEnum } from '@/database/schemas';
import {
  BooleanFieldOptional,
  ClassFieldOptional,
  EnumField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';
import { CreateOrderDetailReqDto } from '../../order-details/dto/create-order-detail.req.dto';

export class OrderCreateReqDto {
  @StringFieldOptional()
  province: string;

  @StringField()
  sessionId: string;

  @NumberFieldOptional()
  voucherAdminId?: number;

  @NumberFieldOptional()
  voucherStoreId?: number;

  @BooleanFieldOptional()
  isCoin?: boolean;

  @NumberFieldOptional()
  storeId?: number;

  @StringField()
  addressFrom: string;

  @EnumField(() => OrderTypeEnum)
  @Expose()
  type: OrderTypeEnum;

  @StringField()
  addressTo: string;

  @StringFieldOptional()
  note?: string;

  @StringField()
  geometryFrom: string;

  @StringField()
  geometryTo: string;

  @ClassFieldOptional(() => CreateOrderDetailReqDto, {
    isArray: true,
  })
  items?: CreateOrderDetailReqDto[];

  @StringFieldOptional()
  nameForContact?: string;

  @StringFieldOptional()
  phoneForContact?: string;

  @NumberFieldOptional()
  areaId: number;

  @StringFieldOptional()
  parent?: string;
}
