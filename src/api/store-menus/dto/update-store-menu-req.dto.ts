import { StringField } from '@/decorators/field.decorators';

export class UpdateStoreMenuReqDto {
  @StringField()
  name: string;
}
