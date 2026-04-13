import { Test, TestingModule } from '@nestjs/testing';
import { StoreRequestsController } from './store-requests.controller';
import { StoreRequestsService } from './store-requests.service';

describe('StoreRequestsController', () => {
  let controller: StoreRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreRequestsController],
      providers: [StoreRequestsService],
    }).compile();

    controller = module.get<StoreRequestsController>(StoreRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
