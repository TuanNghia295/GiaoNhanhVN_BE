import { ClassField, NumberFieldOptional } from 'src/decorators/field.decorators';

export class ItemUpdateDistanceReqDto {
  @NumberFieldOptional()
  id: number;

  @NumberFieldOptional()
  rate: number;
}

export class UpdateDistanceReqDto {
  @ClassField(() => ItemUpdateDistanceReqDto, { isArray: true })
  items: ItemUpdateDistanceReqDto[];
}
