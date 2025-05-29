import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { OrderStatusEnum, OrderTypeEnum } from '@/database/schemas';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';

export class PageMyOrderReqDto extends PageOptionsDto {
  //type[]= fo

  @IsOptional()
  @IsArray()
  @IsEnum(OrderTypeEnum, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @ApiProperty({
    description: 'Loại đơn hàng',
    enum: [OrderTypeEnum],
    isArray: true,
  })
  type?: OrderTypeEnum[];

  @IsOptional()
  @IsArray()
  @IsEnum(OrderStatusEnum, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @ApiProperty({
    description: 'Trạng thái đơn hàng',
    enum: [OrderStatusEnum],
    isArray: true,
  })
  status: OrderStatusEnum[];
}
