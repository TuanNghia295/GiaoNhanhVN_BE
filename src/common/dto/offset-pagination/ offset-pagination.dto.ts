import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class OffsetPaginationDto {
  @ApiProperty()
  @Expose()
  readonly limit: number;

  @ApiProperty()
  @Expose()
  readonly currentPage: number;

  @ApiProperty()
  @Expose()
  readonly nextPage?: boolean;

  @ApiProperty()
  @Expose()
  readonly previousPage?: boolean;

  @ApiProperty()
  @Expose()
  readonly totalRecords: number;

  @ApiProperty()
  @Expose()
  readonly totalPages: number;

  constructor(totalRecords: number, pageOptions: PageOptionsDto) {
    this.limit = pageOptions.limit;
    this.currentPage = pageOptions.page;
    this.totalPages = this.limit > 0 ? Math.ceil(totalRecords / pageOptions.limit) : 0;
    this.totalRecords = totalRecords || 0;
    this.nextPage = this.currentPage < this.totalPages;
    this.previousPage = this.currentPage > 1;
  }
}
