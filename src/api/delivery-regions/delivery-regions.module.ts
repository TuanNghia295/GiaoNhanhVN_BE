import { Module } from '@nestjs/common';
import { DeliveryRegionsController } from './delivery-regions.controller';
import { DeliveryRegionsService } from './delivery-regions.service';

@Module({
  controllers: [DeliveryRegionsController],
  providers: [DeliveryRegionsService],
})
export class DeliveryRegionsModule {}
