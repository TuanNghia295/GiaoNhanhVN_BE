import {
  FileFieldOptional,
  NumberFieldOptional,
  StringField,
} from 'src/decorators/field.decorators';

export class CreateNotificationReqDto {
  @StringField()
  title: string;

  @StringField()
  body: string;

  @FileFieldOptional()
  image?: Express.Multer.File;

  @NumberFieldOptional()
  areaId?: number;
}
