import { StringFieldOptional } from '../../../decorators/field.decorators';

export class UpdateDeliveryRegionsReqDto {
  @StringFieldOptional()
  name?: string;

  @StringFieldOptional()
  price?: number;
}
