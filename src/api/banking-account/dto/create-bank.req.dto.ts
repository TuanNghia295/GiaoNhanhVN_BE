import { StringField } from '@/decorators/field.decorators';

export class CreateBankReqDto {
  @StringField()
  nameBank: string;

  @StringField()
  accountNumber: string;

  @StringField()
  accountName: string;
}
