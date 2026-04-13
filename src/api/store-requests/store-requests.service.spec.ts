import { Test, TestingModule } from '@nestjs/testing';
import { StoreRequestsService } from './store-requests.service';

describe('StoreRequestsService', () => {
  let service: StoreRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreRequestsService],
    }).compile();

    service = module.get<StoreRequestsService>(StoreRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
