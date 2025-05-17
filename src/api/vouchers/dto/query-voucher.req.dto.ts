import { NumberField } from 'src/decorators/field.decorators';

export class QueryVoucherReqDto {
  @NumberField({ description: 'ID của voucher' })
  id: number;
}
