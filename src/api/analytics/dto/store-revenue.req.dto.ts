import { DateFieldOptional, StringFieldOptional } from 'src/decorators/field.decorators';

export class StoreRevenueReqDto {
  @DateFieldOptional({
    example: new Date(),
    default: new Date('1970-01-01'),
  })
  from?: Date;

  @DateFieldOptional({
    example: new Date(),
    default: new Date(),
  })
  to?: Date;

  @StringFieldOptional()
  q?: string;
}
