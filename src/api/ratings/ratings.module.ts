import { OrdersModule } from '@/api/orders/orders.module';
import { StoresModule } from '@/api/stores/stores.module';
import { Module } from '@nestjs/common';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [OrdersModule, StoresModule],
  controllers: [RatingsController],
  providers: [RatingsService],
})
export class RatingsModule {}
