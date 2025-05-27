import { Module } from '@nestjs/common';
import { BankingAccountController } from './banking-account.controller';
import { BankingAccountService } from './banking-account.service';

@Module({
  controllers: [BankingAccountController],
  providers: [BankingAccountService],
})
export class BankingAccountModule {}
