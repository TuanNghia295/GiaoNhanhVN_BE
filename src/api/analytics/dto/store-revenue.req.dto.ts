import { StringFieldOptional } from 'src/decorators/field.decorators';
import { AdminRevenueReqDto } from './admin-revenue.req.dto';

export class StoreRevenueReqDto extends AdminRevenueReqDto {
  @StringFieldOptional()
  q: string;
}
