import { OptionGroupOptionResDto } from '@/api/option-groups/dto/option-group-option.res.dto';
import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import {
  BooleanField,
  ClassField,
  NumberField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class OptionGroupResDto extends AbstractResDto {
  @StringField()
  @Expose()
  name!: string;

  @StringFieldOptional()
  @Expose()
  displayName?: string;

  @BooleanField()
  @Expose()
  isRequired!: boolean;

  @NumberField()
  @Expose()
  minSelect!: number;

  @NumberField()
  @Expose()
  maxSelect!: number;

  @NumberFieldOptional()
  @Expose()
  orderIndex?: number;

  @ClassField(() => OptionGroupOptionResDto)
  @Expose()
  options!: WrapperType<OptionGroupOptionResDto[]>;
}
