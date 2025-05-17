import { UpdateStoreReqDto } from '@/api/stores/dto/update-store.req.dto';
import { PickType } from '@nestjs/swagger';

export class UpdateStatusStoreReqDto extends PickType(UpdateStoreReqDto, [
  'status',
]) {}
