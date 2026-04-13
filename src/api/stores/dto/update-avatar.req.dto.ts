import { FileField } from '@/decorators/field.decorators';

export class UpdateAvatarReqDto {
  @FileField()
  avatar: Express.Multer.File;
}
