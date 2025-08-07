import { NumberField } from '@/decorators/field.decorators';

export class AddCoinReqDto {
  @NumberField()
  coin: number;

  @NumberField()
  userId: number;
}
