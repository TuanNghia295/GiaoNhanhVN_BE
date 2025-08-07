import { CreateExtraReqDto } from '@/api/extras/dto/create-extra.req.dto';
import { CreateOptionReqDto } from '@/api/options/dto/create-option.req.dto';
import {
  ClassFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class UpdateProductReqDto {
  @NumberFieldOptional()
  storeMenuId?: number;

  @NumberFieldOptional()
  storeId?: number;

  @NumberFieldOptional()
  categoryItemId?: number;

  @NumberFieldOptional()
  salePrice?: number;

  @StringFieldOptional()
  name?: string;

  @NumberFieldOptional({
    isPositive: true,
  })
  price?: number;

  @StringFieldOptional()
  description?: string;

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
  options?: CreateOptionReqDto[] = [];

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
  extras?: CreateExtraReqDto[] = [];
}
