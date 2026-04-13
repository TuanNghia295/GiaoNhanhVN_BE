import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';
import { ProductResDto } from 'src/api/products/dto/product.res.dto';
import { WrapperType } from 'src/common/types/types';

export class StoreMenuResDto extends AbstractResDto {
  @StringField()
  @Expose()
  name: string;

  @ClassField(() => ProductResDto)
  @Expose()
  products: WrapperType<ProductResDto>[];
}

// export class StoreMenusResDto {
//   @ClassField(() => StoreMenuResDto)
//   @Expose()
//   storeMenus: WrapperType<StoreMenuResDto>[];
// }
