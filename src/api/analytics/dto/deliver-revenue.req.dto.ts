import {
  DateFieldOptional,
  StringFieldOptional,
} from '../../../decorators/field.decorators';

export class DeliverRevenueReqDto {
  @StringFieldOptional()
  phone?: string;

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
