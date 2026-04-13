import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { NumberField, StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AreaResDto extends AbstractResDto {
  @StringField()
  @Expose()
  name: string;

  @StringField()
  @Expose()
  code: string;

  @StringField()
  @Expose()
  parent: string;

  @NumberField()
  @Expose()
  point: number;
}
