import { Module } from '@nestjs/common';
import { PointTransactionsController } from './point-transactions.controller';
import { PointTransactionsService } from './point-transactions.service';

@Module({
  controllers: [PointTransactionsController],
  providers: [PointTransactionsService],
})
export class PointTransactionsModule {}
