import { FileField } from 'src/decorators/field.decorators';

export class ImportProductReqDto {
  @FileField()
  file: Express.Multer.File;
}
