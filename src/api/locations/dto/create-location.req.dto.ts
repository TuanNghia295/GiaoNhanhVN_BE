import { StringField, StringFieldOptional } from '@/decorators/field.decorators';

export class CreateLocationReqDto {
  @StringField()
  address!: string;

  @StringField()
  geometry!: string;

  @StringFieldOptional({
    example: '10.782418, 106.695635',
  })
  origins?: string;

  // @StringFieldOptional()
  // province?: string;
  //
  // @StringFieldOptional()
  // parent?: string;
}
