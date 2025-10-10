import { BannerEnum } from '@/database/schemas';
import {
  EnumField,
  FileField,
  NumberFieldOptional,
  StringField,
} from '@/decorators/field.decorators';
import { IsOptional, IsString } from 'class-validator';

export class CreateBannerReqDto {
  @EnumField(() => BannerEnum)
  type: BannerEnum;

  @StringField()
  title: string;

  @NumberFieldOptional()
  areaId: number;

  @FileField()
  image: Express.Multer.File;

  @IsOptional()
  @IsString()
  link_store: string;
}
