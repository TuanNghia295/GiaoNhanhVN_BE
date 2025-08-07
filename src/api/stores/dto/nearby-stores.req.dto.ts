import { NumberFieldOptional, StringField } from '@/decorators/field.decorators';

export class NearbyStoresReqDto {
  @StringField()
  origins: string;

  @NumberFieldOptional()
  areaId?: number;
}
