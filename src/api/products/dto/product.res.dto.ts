import { ExtraResDto } from '@/api/extras/dto/extra.res.dto';
import { OptionResDto } from '@/api/options/dto/option.res.dto';
import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import {
  ClassField,
  ClassFieldOptional,
  NumberField,
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
