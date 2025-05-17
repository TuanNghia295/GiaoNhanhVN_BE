import { NumberField, StringField } from '@/decorators/field.decorators';

export class VerifyOtpReqDto {
  @StringField()
  phone: string;

  @NumberField()
  otpCode: number;
}
