import { DateFieldOptional } from '@/decorators/field.decorators';

export class RevenueReqDto {
  @DateFieldOptional()
  from?: Date;

  @DateFieldOptional()
  to?: Date;
}
