import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import { Controller, Get } from '@nestjs/common';
import { BankingAccountService } from './banking-account.service';

@Controller('banking-account')
export class BankingAccountController {
  constructor(private readonly bankingAccountService: BankingAccountService) {}

  @Roles(RoleEnum.DELIVER)
  @ApiAuth({
    summary: 'Lấy thông tin bank của mình [DELIVER]',
  })
  @Get()
  async getBankInfo(@CurrentUser() payload: JwtPayloadType) {
    return await this.bankingAccountService.getBankByAuthorId(payload.id);
  }
}
