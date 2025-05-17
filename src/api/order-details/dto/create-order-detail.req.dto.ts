import {
  ClassFieldOptional,
  NumberField,
  NumberFieldOptional,
} from '@/decorators/field.decorators';

export class CreateOrderDetailReqDto {
  @NumberField()
  productId: number;

  @NumberField({
    isPositive: true,
    minimum: 1,
  })
  quantity: number;

  @NumberFieldOptional()
  optionId?: number;

  @ClassFieldOptional(() => CreateOrderExtras, {
    isArray: true,
  })
  extras?: CreateOrderExtras[];
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
