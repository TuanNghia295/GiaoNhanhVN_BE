import { ClassField, NumberField } from '@/decorators/field.decorators';

export class SortItemReqDto {
  @NumberField()
  storeMenuId: number;

  @NumberField()
  index: number;
}

export class SortStoreMenuReqDto {
  @ClassField(() => SortItemReqDto, { isArray: true })
  items: SortItemReqDto[];
}
