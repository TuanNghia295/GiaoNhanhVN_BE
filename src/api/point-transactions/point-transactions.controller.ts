import { Controller, Get } from '@nestjs/common';
import { PointTransactionsService } from './point-transactions.service';

@Controller('point-transactions')
export class PointTransactionsController {
  constructor(private readonly pointTransactionsService: PointTransactionsService) {}

  // list log transactions
  @Get('log')
  async getLogTransactions() {
    return this.pointTransactionsService.getLogTransactions();
  }
}
