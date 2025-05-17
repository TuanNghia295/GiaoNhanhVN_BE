import { OrdersModule } from '@/api/orders/orders.module';
import { Module } from '@nestjs/common';
import { DeliversController } from './delivers.controller';
import { DeliversService } from './delivers.service';

@Module({
  imports: [OrdersModule],
  controllers: [DeliversController],
  providers: [DeliversService],
  exports: [DeliversService],
})
export class DeliversModule {}
