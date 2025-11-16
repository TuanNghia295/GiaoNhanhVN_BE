import { NumberField, NumberFieldOptional, StringField } from '@/decorators/field.decorators';

export class CreateOptionReqDto {
  @NumberFieldOptional({ description: 'ID của option trong nhóm (điền khi cập nhật)' })
  id?: number;

  @StringField()
  name: string;

  @NumberField()
  price: number;
}
