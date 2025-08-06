import { ClassField, NumberField } from '@/decorators/field.decorators';

export class SortItemReqDto {
  @NumberField()
  productId: number;

  @NumberField()
  index: number;
}

export class SortProductReqDto {
  @ClassField(() => SortItemReqDto, { isArray: true })
  items: SortItemReqDto[];
}
