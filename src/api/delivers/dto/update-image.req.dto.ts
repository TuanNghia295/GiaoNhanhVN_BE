import { FileField } from '@/decorators/field.decorators';

export class UpdateImageReqDto {
  @FileField()
  image: Express.Multer.File;
}
