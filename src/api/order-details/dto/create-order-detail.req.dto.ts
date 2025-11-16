import {
  ClassFieldOptional,
  NumberField,
  NumberFieldOptional,
} from '@/decorators/field.decorators';

export class CreateOrderSelectedOptionReqDto {
  @NumberField({ description: 'ID của nhóm lựa chọn (option group) thuộc về sản phẩm' })
  optionGroupId!: number;

  @NumberField({ description: 'ID của lựa chọn cụ thể nằm trong nhóm option tương ứng' })
  optionGroupOptionId!: number;
}

export class CreateOrderDetailReqDto {
  @NumberField()
  productId: number;

  @NumberField({
    isPositive: true,
    minimum: 1,
  })
  quantity: number;

  @ClassFieldOptional(() => CreateOrderExtras, {
    isArray: true,
  })
  extras?: CreateOrderExtras[];

  @ClassFieldOptional(() => CreateOrderSelectedOptionReqDto, {
    isArray: true,
    description: 'Danh sách các lựa chọn đã chọn theo từng option group của sản phẩm',
  })
  selectedOptions?: CreateOrderSelectedOptionReqDto[];
}

export class CreateOrderExtras {
  @NumberFieldOptional()
  extraId: number;

  @NumberFieldOptional({
    isPositive: true,
    minimum: 1,
  })
  quantity: number;
}
