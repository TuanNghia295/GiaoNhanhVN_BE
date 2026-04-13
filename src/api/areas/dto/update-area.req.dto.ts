import { StringFieldOptional } from '@/decorators/field.decorators';

export class UpdateAreaReqDto {
  @StringFieldOptional()
  username?: string;

  @StringFieldOptional()
  password?: string;

  @StringFieldOptional()
  location?: string;

  @StringFieldOptional()
  phone?: string;

  @StringFieldOptional()
  name?: string;

  @StringFieldOptional()
  code?: string;

  @StringFieldOptional()
  parent?: string;
}
