import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { StringField } from 'src/decorators/field.decorators';

export class SearchPageStoresReqDto extends PageOptionsDto {
  @StringField({
    default: '10.782418,106.695635',
  })
  readonly origins: string;
}
