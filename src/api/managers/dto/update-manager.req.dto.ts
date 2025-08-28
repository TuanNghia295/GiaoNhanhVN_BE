import { StringFieldOptional } from '@/decorators/field.decorators';

export class UpdateManagerReqDto {
  @StringFieldOptional()
  username: string;

  @StringFieldOptional({
    default: '123456',
  })
  password: string;

  @StringFieldOptional()
  phone: string;
}
