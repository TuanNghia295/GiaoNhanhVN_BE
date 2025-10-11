import { BannerEnum } from '@/database/schemas';
import {
  EnumField,
  FileFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class UploadBannerReqDto {
  @EnumField(() => BannerEnum)
  type: BannerEnum;

  @StringField()
  title: string;

  @FileFieldOptional()
  image?: Express.Multer.File;

  @StringFieldOptional()
  link_store: string;
}
