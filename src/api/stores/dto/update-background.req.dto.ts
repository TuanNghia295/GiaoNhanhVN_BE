import { FileFieldOptional } from '@/decorators/field.decorators';

export class UpdateBackgroundReqDto {
  @FileFieldOptional()
  background?: Express.Multer.File;
}
