import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import {
  ClassField,
  ClassFieldOptional,
  NumberField,
  StringField,
} from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';
import { ExtraResDto } from '../../extras/dto/extra.res.dto';
import { OptionResDto } from '../../options/dto/option.res.dto';
import { ProductResDto } from '../../products/dto/product.res.dto';

export class OrderDetailResDto extends AbstractResDto {
  @ClassField(() => ProductResDto)
  @Expose()
  product: ProductResDto;

  @ClassFieldOptional(() => OptionResDto)
  @Expose()
  option?: OptionResDto;

  @ClassFieldOptional(() => OrderDetailSelectedOptionResDto, {
    description: 'Danh sách các lựa chọn đã chọn theo từng option group của sản phẩm',
  })
  @Expose()
  selectedOptions?: WrapperType<OrderDetailSelectedOptionResDto[]>;

  @NumberField()
  @Expose()
  total: number;

  @ClassFieldOptional(() => ExtraOnOderResDto)
  @Expose()
  extras: WrapperType<ExtraOnOderResDto>[];
}

class ExtraOnOderResDto {
  @NumberField()
  @Expose()
  quantity: number;

  @ClassField(() => ExtraResDto)
  @Expose()
  extra: WrapperType<ExtraResDto>;
}

class OrderDetailSelectedOptionResDto {
  @NumberField({ description: 'ID của option group mà lựa chọn này thuộc về' })
  @Expose()
  optionGroupId: number;

  @StringField({ description: 'Tên hiển thị của option group' })
  @Expose()
  optionGroupName: string;

  @NumberField({ description: 'ID của option_group_option đã được chọn' })
  @Expose()
  optionGroupOptionId: number;

  @StringField({ description: 'Tên của option đã chọn' })
  @Expose()
  optionName: string;

  @NumberField({ description: 'Giá cộng thêm của option đã chọn (snapshot tại thời điểm order)' })
  @Expose()
  price: number;
}
