import { StringField } from '@/decorators/field.decorators';
import { IsOptional } from 'class-validator';

export class ZaloCallbackReqDto {
  @StringField()
  oa_id: string;

  @StringField()
  code: string;

  @StringField()
  @IsOptional()
  state: string;
}
