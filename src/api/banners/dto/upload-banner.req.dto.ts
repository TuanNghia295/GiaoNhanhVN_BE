import { BannerEnum } from '@/database/schemas';
import { EnumField, FileFieldOptional, StringField } from '@/decorators/field.decorators';
import { IsOptional, IsString } from 'class-validator';

export class UploadBannerReqDto {
  @EnumField(() => BannerEnum)
  type: BannerEnum;

  @StringField()
  title: string;

  @FileFieldOptional()
  image?: Express.Multer.File;

  @IsOptional()
  @IsString()
  link_store: string;
}
