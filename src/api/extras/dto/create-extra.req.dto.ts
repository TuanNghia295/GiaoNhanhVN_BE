import { NumberField, NumberFieldOptional, StringField } from '@/decorators/field.decorators';

export class CreateExtraReqDto {
  @NumberFieldOptional({ description: 'ID của extra hiện có (điền khi cập nhật)' })
  id?: number;

  @StringField({ description: 'Tên hiển thị của extra' })
  name: string;

  @NumberField({ description: 'Giá cộng thêm của extra' })
  price: number;
}
