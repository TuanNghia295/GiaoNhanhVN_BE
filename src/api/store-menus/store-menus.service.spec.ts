import { Test, TestingModule } from '@nestjs/testing';
import { StoreMenusService } from './store-menus.service';

describe('StoreMenusService', () => {
  let service: StoreMenusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreMenusService],
    }).compile();

    service = module.get<StoreMenusService>(StoreMenusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
