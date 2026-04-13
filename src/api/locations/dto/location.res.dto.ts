import { AreaResDto } from '@/api/areas/dto/area.res.dto';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class LocationResDto extends AbstractResDto {
  @StringField()
  @Expose()
  address: string;

  @StringField()
  @Expose()
  geometry: string;

  @ClassField(() => AreaResDto)
  @Expose()
  Area: AreaResDto;
}
