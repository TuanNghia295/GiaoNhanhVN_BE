import {
  BooleanFieldOptional,
  FileFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from 'src/decorators/field.decorators';

export class UpdateNotificationReqDto {
  @StringFieldOptional()
  title?: string;

  @StringFieldOptional()
  body?: string;

  @BooleanFieldOptional()
  isRead?: boolean;

  @FileFieldOptional()
  image: Express.Multer.File;

  @NumberFieldOptional()
  userId?: number;

  @NumberFieldOptional()
  areaId?: number;
}
