import { Exclude, Expose } from 'class-transformer';
import { DateField, NumberField } from '../../decorators/field.decorators';

@Exclude()
export abstract class AbstractResDto {
  @NumberField()
  @Expose()
  id: number;

  @DateField()
  @Expose()
  createdAt: Date;

  @DateField()
  @Expose()
  updatedAt: Date;
}
