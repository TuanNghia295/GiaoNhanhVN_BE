import { ProductsModule } from '@/api/products/products.module';
import { StoreRequestsModule } from '@/api/store-requests/store-requests.module';
import { StoresModule } from '@/api/stores/stores.module';
import { UsersController } from '@/api/users/users.controller';
import { UsersService } from '@/api/users/users.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [StoresModule, StoreRequestsModule, ProductsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
