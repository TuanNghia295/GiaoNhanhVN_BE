import { ClassField, NumberField } from '@/decorators/field.decorators';

export class SortMenuStoreItemReqDto {
  @NumberField()
  storeMenuId: number;

  @NumberField()
  index: number;
}

export class SortStoreMenuReqDto {
  @ClassField(() => SortMenuStoreItemReqDto, { isArray: true })
  items: SortMenuStoreItemReqDto[];
}
