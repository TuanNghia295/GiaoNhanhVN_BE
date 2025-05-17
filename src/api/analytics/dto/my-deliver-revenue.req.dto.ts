import { DateField } from '../../../decorators/field.decorators';

export class MyDeliverRevenueReqDto {
  @DateField({
    example: new Date(),
  })
  from: Date;

  @DateField({
    example: new Date(),
  })
  to: Date;
}
