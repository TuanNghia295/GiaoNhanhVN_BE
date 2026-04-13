import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import {
  BooleanFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
} from 'src/decorators/field.decorators';

export enum SortStoreMenuEnum {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export class PageStoreMenuReqDto extends PageOptionsDto {
  @NumberFieldOptional()
  storeId?: number;

  @BooleanFieldOptional()
  isShop?: boolean;

  @EnumFieldOptional(() => SortStoreMenuEnum)
  sortBy?: SortStoreMenuEnum;
}
