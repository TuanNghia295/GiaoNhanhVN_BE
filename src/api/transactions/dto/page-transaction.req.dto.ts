import { PageOptionsDto } from '@/common/dto/offset-pagination/ page-options.dto';
import { NumberFieldOptional } from '@/decorators/field.decorators';

export class PagingTransaction extends PageOptionsDto {
  @NumberFieldOptional()
  managerId?: number;

  @NumberFieldOptional()
  deliverId?: number;
}
