import { Exclude, Expose } from 'class-transformer';
import { AbstractResDto } from '../../../database/dto/abstract.res.dto';
import { NumberField, StringField } from '../../../decorators/field.decorators';

@Exclude()
export class DeliveryRegionsResDto extends AbstractResDto {
  @StringField()
  @Expose()
  name: string;

  @NumberField()
  @Expose()
  price: number;
}
