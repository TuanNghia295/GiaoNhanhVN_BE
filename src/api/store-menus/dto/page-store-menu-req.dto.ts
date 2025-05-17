import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import {
  BooleanFieldOptional,
  NumberField,
} from 'src/decorators/field.decorators';

export class PageStoreMenuReqDto extends PageOptionsDto {
  @NumberField()
  storeId: number;

  @BooleanFieldOptional()
  isShop?: boolean;
}
