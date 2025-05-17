import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import {
  BooleanFieldOptional,
  NumberFieldOptional,
  StringField,
} from '@/decorators/field.decorators';

export class PageStoreReqDto extends PageOptionsDto {
  @StringField({
    default: '10.782418,106.695635',
  })
  readonly origins: string;

  @NumberFieldOptional()
  readonly categoryItemId?: number;

  @NumberFieldOptional()
  areaId?: number;

  @BooleanFieldOptional()
  readonly isRating?: boolean;

  @BooleanFieldOptional()
  readonly isBestSeller?: boolean;
}
