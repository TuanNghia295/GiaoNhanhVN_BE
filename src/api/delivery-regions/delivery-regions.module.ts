import { Module } from '@nestjs/common';
import { AreasModule } from '../areas/areas.module';
import { DeliveryRegionsController } from './delivery-regions.controller';
import { DeliveryRegionsService } from './delivery-regions.service';

@Module({
  imports: [AreasModule],
  controllers: [DeliveryRegionsController],
  providers: [DeliveryRegionsService],
})
export class DeliveryRegionsModule {}
