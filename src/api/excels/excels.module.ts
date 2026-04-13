import { AnalyticsModule } from '@/api/analytics/analytics.module';
import { ExtrasModule } from '@/api/extras/extras.module';
import { OptionGroupsModule } from '@/api/option-groups/option-groups.module';
import { OrdersModule } from '@/api/orders/orders.module';
import { ProductsModule } from '@/api/products/products.module';
import { StoresModule } from '@/api/stores/stores.module';
import { Module } from '@nestjs/common';
import { ExcelsController } from './excels.controller';
import { ExcelsService } from './excels.service';

@Module({
  imports: [
    StoresModule,
    ProductsModule,
    AnalyticsModule,
    OrdersModule,
    OptionGroupsModule,
    ExtrasModule,
  ],
  controllers: [ExcelsController],
  providers: [ExcelsService],
})
export class ExcelsModule {}
