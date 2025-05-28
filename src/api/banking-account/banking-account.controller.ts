import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateBankReqDto } from '@/api/banking-account/dto/create-bank.req.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
} from '@nestjs/common';
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

  @ApiAuth({
    summary: 'Tạo mới tài khoản banking',
  })
  @Post()
  @Roles(RoleEnum.DELIVER)
  async createOrUpdate(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: CreateBankReqDto,
  ) {
    switch (payload.role) {
      case RoleEnum.DELIVER:
        return this.bankingAccountService.createOrUpdate(payload.id, reqDto);
      default:
        throw new ForbiddenException();
    }
  }
}
