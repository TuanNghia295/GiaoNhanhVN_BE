import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class OffsetPaginatedDto<TData> {
  @ApiProperty({ type: [Object] })
  @Expose()
  readonly data: TData[];

  @ApiProperty()
  @Expose()
  pagination: OffsetPaginationDto;

  constructor(data: TData[], meta: OffsetPaginationDto) {
    this.data = data;
    this.pagination = meta;
  }
}
