import { Exclude, Expose } from 'class-transformer';
import { AbstractResDto } from 'src/database/dto/abstract.res.dto';
import { NumberField } from 'src/decorators/field.decorators';

@Exclude()
export class DistanceSettingResDto extends AbstractResDto {
  @NumberField()
  @Expose()
  minDistance: number;

  @NumberField()
  @Expose()
  maxDistance: number;

  @NumberField()
  @Expose()
  rate: number;
}
