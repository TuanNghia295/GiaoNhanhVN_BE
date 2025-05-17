import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { NumberField, StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ExtraResDto extends AbstractResDto {
  @StringField()
  @Expose()
  name: string;

  @NumberField()
  @Expose()
  price: number;
}
