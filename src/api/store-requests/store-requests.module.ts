import { AreasModule } from '@/api/areas/areas.module';
import { NotificationsModule } from '@/api/notifications/notifications.module';
import { StoresModule } from '@/api/stores/stores.module';
import { Module } from '@nestjs/common';
import { StoreRequestsController } from './store-requests.controller';
import { StoreRequestsService } from './store-requests.service';

@Module({
  imports: [AreasModule, StoresModule, NotificationsModule],
  controllers: [StoreRequestsController],
  providers: [StoreRequestsService],
})
export class StoreRequestsModule {}
