import { StringField } from '@/decorators/field.decorators';

export class FlashSaleProductReqDto {
  @StringField({
    default: '10.782418,106.695635',
  })
  readonly origins: string;
}
