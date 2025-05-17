import { DeliversModule } from '@/api/delivers/delivers.module';
import { DeliversEvent } from '@/api/events/delivers.event';
import { OrdersEvent } from '@/api/events/orders.event';
import { UsersEvent } from '@/api/events/users.event';
import { GatewaysModule } from '@/api/gateways/gateways.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [GatewaysModule, DeliversModule],
  providers: [UsersEvent, DeliversEvent, OrdersEvent],
})
export class EventsModule {}
