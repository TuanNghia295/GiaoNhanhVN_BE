import { DeliversModule } from '@/api/delivers/delivers.module';
import { DeliversEvent } from '@/api/events/delivers.event';
import { NotificationEvent } from '@/api/events/notification.event';
import { OrdersEvent } from '@/api/events/orders.event';
import { StoreRequestsEvent } from '@/api/events/store-requests.event';
import { UsersEvent } from '@/api/events/users.event';
import { GatewaysModule } from '@/api/gateways/gateways.module';
import { StoresModule } from '@/api/stores/stores.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [GatewaysModule, DeliversModule, StoresModule],
  providers: [
    UsersEvent,
    DeliversEvent,
    OrdersEvent,
    StoreRequestsEvent,
    NotificationEvent,
  ],
})
export class EventsModule {}
