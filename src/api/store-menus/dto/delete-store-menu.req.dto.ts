import { NumberField } from 'src/decorators/field.decorators';

export class DeleteStoreMenuReqDto {
  @NumberField()
  id: number;
}
