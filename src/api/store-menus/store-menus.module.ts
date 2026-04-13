import { StoresModule } from '@/api/stores/stores.module';
import { Module } from '@nestjs/common';
import { StoreMenusController } from './store-menus.controller';
import { StoreMenusService } from './store-menus.service';

@Module({
  imports: [StoresModule],
  controllers: [StoreMenusController],
  providers: [StoreMenusService],
  exports: [StoreMenusService],
})
export class StoreMenusModule {}
