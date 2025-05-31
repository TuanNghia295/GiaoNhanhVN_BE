import { Controller } from '@nestjs/common';
import { DeliveryRegionsService } from './delivery-regions.service';

@Controller('delivery-regions')
export class DeliveryRegionsController {
  constructor(
    private readonly deliveryRegionsService: DeliveryRegionsService,
  ) {}
}
