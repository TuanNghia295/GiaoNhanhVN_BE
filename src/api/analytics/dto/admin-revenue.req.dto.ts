import {
  DateFieldOptional,
  NumberFieldOptional,
} from 'src/decorators/field.decorators';

export class AdminRevenueReqDto {
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

  @NumberFieldOptional()
  areaId: number;
}
