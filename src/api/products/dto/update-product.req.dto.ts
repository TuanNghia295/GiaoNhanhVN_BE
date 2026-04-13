import { CreateExtraReqDto } from '@/api/extras/dto/create-extra.req.dto';
import { CreateOptionGroupReqDto } from '@/api/option-groups/dto/create-option-group.req.dto';
import {
  ClassFieldOptional,
  DateFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class UpdateProductReqDto {
  @NumberFieldOptional()
  storeMenuId?: number;

  @NumberFieldOptional()
  storeId?: number;

  @NumberFieldOptional()
  quantity?: number;

  @DateFieldOptional()
  startDate?: Date;

  @DateFieldOptional()
  endDate?: Date;

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

  @NumberFieldOptional({
    isPositive: true,
  })
  limitedFlashSaleQuantity?: number;

  @ClassFieldOptional(() => CreateExtraReqDto, {
    default: [
      {
        id: 101,
        name: 'Extra 1',
        price: 10,
      },
      {
        id: 102,
        name: 'Extra 2',
        price: 20,
      },
    ],
  })
  extras?: CreateExtraReqDto[];

  @ClassFieldOptional(() => CreateOptionGroupReqDto, {
    description: 'Danh sách các option group cần cập nhật (bao gồm id để diff)',
    isArray: true,
  })
  optionGroups?: CreateOptionGroupReqDto[];
}
