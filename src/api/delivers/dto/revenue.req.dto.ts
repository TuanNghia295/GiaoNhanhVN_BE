import { DateField } from '@/decorators/field.decorators';

export class RevenueReqDto {
  @DateField()
  from: Date;

  @DateField()
  to: Date;
}
