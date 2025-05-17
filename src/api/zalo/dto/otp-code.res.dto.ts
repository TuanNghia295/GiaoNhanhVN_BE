import { NumberField, StringField } from 'src/decorators/field.decorators';

export class OTPCodeResDto {
  @NumberField()
  status: number;

  @StringField()
  message: string;

  @NumberField()
  OtpCode: number;

  @NumberField()
  ExpireTime: number;
}
