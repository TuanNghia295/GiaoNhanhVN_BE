import { AreasModule } from '@/api/areas/areas.module';
import { DeliversModule } from '@/api/delivers/delivers.module';
import { ManagersModule } from '@/api/managers/managers.module';
import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [DeliversModule, AreasModule, ManagersModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
