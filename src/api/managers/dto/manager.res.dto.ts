import { AreaResDto } from '@/api/areas/dto/area.res.dto';
import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { Exclude, Expose } from 'class-transformer';
import {
  BooleanField,
  ClassField,
  NumberField,
  StringField,
} from 'src/decorators/field.decorators';

@Exclude()
export class ManagerResDto extends AbstractResDto {
  @StringField()
  @Expose()
  username: string;

  @StringField()
  @Expose()
  fullName: string;

  @StringField()
  @Expose()
  email: string;

  @StringField()
  @Expose()
  phone: string;

  @StringField()
  @Expose()
  avatar: string;

  @BooleanField()
  @Expose()
  status: boolean;

  @BooleanField()
  @Expose()
  activated: boolean;

  @NumberField()
  @Expose()
  areaId: number;

  @ClassField(() => AreaResDto)
  @Expose()
  area: WrapperType<AreaResDto>;
}
