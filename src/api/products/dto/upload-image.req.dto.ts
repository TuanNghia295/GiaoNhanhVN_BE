import { FileField } from '@/decorators/field.decorators';

export class UploadImageReqDto {
  @FileField()
  image: Express.Multer.File;
}
