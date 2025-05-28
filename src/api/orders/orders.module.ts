import { AreasModule } from '@/api/areas/areas.module';
import { DeliversModule } from '@/api/delivers/delivers.module';
import { StoresModule } from '@/api/stores/stores.module';
import { UsersModule } from '@/api/users/users.module';
import { VouchersModule } from '@/api/vouchers/vouchers.module';
import { forwardRef, Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    AreasModule,
    VouchersModule,
    UsersModule,
    StoresModule,
    forwardRef(() => DeliversModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
