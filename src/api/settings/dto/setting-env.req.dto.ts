import { NumberFieldOptional } from 'src/decorators/field.decorators';

export class SettingEnvReqDto {
  @NumberFieldOptional()
  areaId?: number;
}
