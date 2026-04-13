import { CategoryItemResDto } from '@/api/category-items/dto/category-item.res.dto';
import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CategoryResDto extends AbstractResDto {
  @StringField()
  @Expose()
  name: string;

  @StringField()
  @Expose()
  code: string;

  @ClassField(() => CategoryItemResDto)
  @Expose()
  categoryItems: WrapperType<CategoryItemResDto[]>;
}
