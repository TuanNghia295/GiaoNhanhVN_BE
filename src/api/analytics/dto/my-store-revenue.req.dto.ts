import { OrderTypeEnum } from '@/database/schemas';
import {
  DateFieldOptional,
  EnumField,
  NumberFieldOptional,
} from '@/decorators/field.decorators';

export class MyStoreRevenueReqDto {
  @NumberFieldOptional()
  storeId: number;

  @EnumField(() => OrderTypeEnum)
  type: OrderTypeEnum;

  @DateFieldOptional({
    example: new Date(),
    default: new Date('1970-01-01'),
  })
  from: Date;

  @DateFieldOptional({
    example: new Date(),
    default: new Date(),
  })
  to: Date;
}
