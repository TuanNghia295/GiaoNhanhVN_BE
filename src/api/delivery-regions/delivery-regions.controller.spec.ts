import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryRegionsController } from './delivery-regions.controller';
import { DeliveryRegionsService } from './delivery-regions.service';

describe('DeliveryRegionsController', () => {
  let controller: DeliveryRegionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryRegionsController],
      providers: [DeliveryRegionsService],
    }).compile();

    controller = module.get<DeliveryRegionsController>(DeliveryRegionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
