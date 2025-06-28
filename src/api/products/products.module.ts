import { CategoryItemsModule } from '@/api/category-items/category-items.module';
import { ExtrasModule } from '@/api/extras/extras.module';
import { OptionsModule } from '@/api/options/options.module';
import { StoreMenusModule } from '@/api/store-menus/store-menus.module';
import { StoresModule } from '@/api/stores/stores.module';
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [StoresModule, StoreMenusModule, CategoryItemsModule, OptionsModule, ExtrasModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
