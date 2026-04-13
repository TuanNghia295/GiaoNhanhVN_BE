import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryRegionsService } from './delivery-regions.service';

describe('DeliveryRegionsService', () => {
  let service: DeliveryRegionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryRegionsService],
    }).compile();

    service = module.get<DeliveryRegionsService>(DeliveryRegionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
