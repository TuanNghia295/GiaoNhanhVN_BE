import { NumberField, NumberFieldOptional, StringField } from '@/decorators/field.decorators';

export class CreateOptionGroupOptionReqDto {
  @NumberFieldOptional({ description: 'ID của option khi cập nhật (để diff theo ID)' })
  id?: number;

  @StringField()
  name!: string;

  @NumberField()
  price!: number;
}
