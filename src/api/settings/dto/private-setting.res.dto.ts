import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { NumberField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { IsOptional } from 'class-validator';

@Exclude()
export class PrivateSettingResDto extends AbstractResDto {
  @NumberField()
  @IsOptional()
  @Expose()
  numberStores: number | null;

  @NumberField()
  @IsOptional()
  @Expose()
  numberRadius: number | null;
}
