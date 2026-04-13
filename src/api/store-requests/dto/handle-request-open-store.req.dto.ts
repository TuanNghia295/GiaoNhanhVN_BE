import { NumberField } from 'src/decorators/field.decorators';

export class HandleRequestOpenStoreReqDto {
  @NumberField()
  storeRequestId: number;
}
