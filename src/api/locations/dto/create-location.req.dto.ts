import {
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CreateLocationReqDto {
  @StringField()
  address!: string;

  @StringField()
  geometry!: string;

  @StringFieldOptional()
  province?: string;

  @StringFieldOptional()
  parent?: string;
}
