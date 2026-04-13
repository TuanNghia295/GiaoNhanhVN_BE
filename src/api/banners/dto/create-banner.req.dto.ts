import { BannerEnum } from '@/database/schemas';
import {
  EnumField,
  FileField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CreateBannerReqDto {
  @EnumField(() => BannerEnum)
  type: BannerEnum;

  @StringField()
  title: string;

  @NumberFieldOptional()
  areaId: number;

  @FileField()
  image: Express.Multer.File;

  @StringFieldOptional()
  link_store: string;
}
