import { StringField } from '@/decorators/field.decorators';

export class CreateStoreMenuReqDto {
  @StringField()
  name: string;
}
