import { VouchersStatusEnum } from '@/database/schemas';
import { PartialType } from '@nestjs/swagger';
import { EnumFieldOptional } from 'src/decorators/field.decorators';
import { CreateVoucherReqDto } from './create-voucher.req.dto';

export class UpdateVoucherReqDto extends PartialType(CreateVoucherReqDto) {
  @EnumFieldOptional(() => VouchersStatusEnum)
  status: VouchersStatusEnum;
}
