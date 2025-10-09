import { CreateExtraReqDto } from '@/api/extras/dto/create-extra.req.dto';
import { CreateOptionReqDto } from '@/api/options/dto/create-option.req.dto';
import {
  ClassFieldOptional,
  DateFieldOptional,
  NumberField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CreateProductReqDto {
  @NumberField()
  storeMenuId!: number;

  @NumberFieldOptional()
  salePrice?: number;

  @NumberField()
  storeId!: number;

  @NumberField()
  categoryItemId!: number;

  @NumberFieldOptional()
  quantity?: number;

  @DateFieldOptional()
  startDate?: Date;

  @DateFieldOptional()
  endDate?: Date;

  @StringField()
  name!: string;

  @NumberField({
    isPositive: true,
  })
  price!: number;

  @StringFieldOptional()
  description?: string;

  @NumberFieldOptional({
    isPositive: true,
  })
  limitedFlashSaleQuantity?: number;

  @ClassFieldOptional(() => CreateOptionReqDto, {
    default: [
      {
        name: 'Option 1',
        price: 10,
      },
      {
        name: 'Option 2',
        price: 20,
      },
    ],
  })
  options?: CreateOptionReqDto[];

  @ClassFieldOptional(() => CreateExtraReqDto, {
    default: [
      {
        name: 'Extra 1',
        price: 10,
      },
      {
        name: 'Extra 2',
        price: 20,
      },
    ],
  })
  extras?: CreateExtraReqDto[];
}
