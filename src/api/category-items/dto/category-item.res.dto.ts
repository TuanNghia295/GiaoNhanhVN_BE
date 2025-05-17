import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CategoryItemResDto extends AbstractResDto {
  @StringField()
  @Expose()
  name: string;

  @StringField()
  @Expose()
  code: string;
}
