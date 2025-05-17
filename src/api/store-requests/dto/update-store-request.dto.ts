import { PartialType } from '@nestjs/swagger';
import { CreateStoreReqDto } from './create-store-req.dto';

export class UpdateStoreRequestDto extends PartialType(CreateStoreReqDto) {}
