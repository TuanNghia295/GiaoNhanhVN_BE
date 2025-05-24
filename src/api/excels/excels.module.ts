import { ProductsModule } from '@/api/products/products.module';
import { StoresModule } from '@/api/stores/stores.module';
import { Module } from '@nestjs/common';
import { ExcelsController } from './excels.controller';
import { ExcelsService } from './excels.service';

@Module({
  imports: [StoresModule, ProductsModule],
  controllers: [ExcelsController],
  providers: [ExcelsService],
})
export class ExcelsModule {}
