import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import {
  BooleanFieldOptional,
  EnumFieldOptional,
  NumberField,
} from 'src/decorators/field.decorators';

export enum SortStoreMenuEnum {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export class PageStoreMenuReqDto extends PageOptionsDto {
  @NumberField()
  storeId: number;

  @BooleanFieldOptional()
  isShop?: boolean;

  @EnumFieldOptional(() => SortStoreMenuEnum)
  sortBy?: SortStoreMenuEnum;
}
