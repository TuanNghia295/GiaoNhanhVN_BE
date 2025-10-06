import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { BannerEnum } from '@/database/schemas';
import { EnumField, FileField, StringField } from '@/decorators/field.decorators';

export class BannerResDto extends AbstractResDto {
  @EnumField(() => BannerEnum)
  type: BannerEnum;

  @StringField()
  title: string;

  @FileField()
  images: string;

  @StringField()
  link_store: string;
}
