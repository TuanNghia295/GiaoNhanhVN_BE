import { Module } from '@nestjs/common';
import { CategoryItemsController } from './category-items.controller';
import { CategoryItemsService } from './category-items.service';

@Module({
  controllers: [CategoryItemsController],
  providers: [CategoryItemsService],
  exports: [CategoryItemsService],
})
export class CategoryItemsModule {}
