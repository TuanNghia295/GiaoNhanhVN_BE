import { LoginResDto } from 'src/api/auth/dto/login.res.dto';
import { BooleanField } from 'src/decorators/field.decorators';

export class VerifyZaloResDto extends LoginResDto {
  @BooleanField()
  isRegistered: boolean;
}
