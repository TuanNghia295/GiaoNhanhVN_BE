import { StringField, StringFieldOptional } from '@/decorators/field.decorators';

export class HotlineReqDto {
  @StringField()
  provinceName: string;

  @StringFieldOptional()
  parentName?: string;
}
