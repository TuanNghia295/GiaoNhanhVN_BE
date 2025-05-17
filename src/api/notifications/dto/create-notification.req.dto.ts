import { NotificationTypeEnum } from '@/database/schemas/notification.schema';
import {
  EnumFieldOptional,
  FileFieldOptional,
  NumberFieldOptional,
  StringField,
} from 'src/decorators/field.decorators';

export class CreateNotificationReqDto {
  @StringField()
  title: string;

  @StringField()
  body: string;

  @EnumFieldOptional(() => NotificationTypeEnum)
  type?: NotificationTypeEnum;

  @FileFieldOptional()
  image?: Express.Multer.File;

  @NumberFieldOptional()
  userId: number;

  @NumberFieldOptional()
  areaId?: number;
}
