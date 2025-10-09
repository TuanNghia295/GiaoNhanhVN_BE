import { ExtraResDto } from '@/api/extras/dto/extra.res.dto';
import { OptionResDto } from '@/api/options/dto/option.res.dto';
import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import {
  BooleanFieldOptional,
  ClassField,
  ClassFieldOptional,
  DateFieldOptional,
  NumberField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';
import { CategoryItemResDto } from 'src/api/category-items/dto/category-item.res.dto';

export class ProductResDto extends AbstractResDto {
  @Expose()
  @StringField()
  name: string;

  @NumberField()
  @Expose()
  price: number;

  @Expose()
  @StringFieldOptional()
  description?: string;

  @Expose()
  @StringFieldOptional()
  image?: string;

  @Expose()
  @NumberFieldOptional()
  quantity?: number;

  @Expose()
  @NumberFieldOptional()
  salePrice?: number;

  @Expose()
  @DateFieldOptional()
  startDate?: Date;

  @Expose()
  @DateFieldOptional()
  endDate?: Date;

  @Expose()
  @NumberFieldOptional()
  limitedFlashSaleQuantity?: number;

  @Expose()
  @NumberFieldOptional()
  usedSaleQuantity?: number;

  @Expose()
  @NumberFieldOptional()
  index?: number;

  @Expose()
  @BooleanFieldOptional()
  isLocked?: boolean;

  @Expose()
  @NumberFieldOptional()
  storeId?: number;

  @Expose()
  @NumberFieldOptional()
  storeMenuId?: number;

  @Expose()
  @NumberFieldOptional()
  categoryItemId?: number;

  @ClassFieldOptional(() => OptionResDto)
  @Expose()
  options?: WrapperType<OptionResDto[]>;

  @ClassField(() => ExtraResDto)
  @Expose()
  extras?: WrapperType<ExtraResDto[]>;

  @Expose()
  @ClassField(() => CategoryItemResDto)
  categoryItem: WrapperType<CategoryItemResDto[]>;
}
