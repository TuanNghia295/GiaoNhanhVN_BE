import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { OrderStatusEnum } from '@/database/schemas';
import {
  DateFieldOptional,
  EnumFieldOptional,
} from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';

export class PageMyOrderReqDto extends PageOptionsDto {
  @EnumFieldOptional(() => OrderStatusEnum)
  @ApiProperty({
    description: 'Trạng thái đơn hàng',
    enum: OrderStatusEnum,
  })
  status: OrderStatusEnum;

  @DateFieldOptional()
  @ApiProperty({
    description: 'Ngày bắt đầu lọc đơn hàng',
    type: Date,
  })
  startDate?: Date;

  @DateFieldOptional()
  @ApiProperty({
    description: 'Ngày kết thúc lọc đơn hàng',
    type: Date,
  })
  endDate?: Date;
}
