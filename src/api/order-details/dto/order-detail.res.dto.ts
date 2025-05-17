import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import {
  ClassField,
  ClassFieldOptional,
  NumberField,
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
