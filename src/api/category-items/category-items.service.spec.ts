import { Test, TestingModule } from '@nestjs/testing';
import { CategoryItemsService } from './category-items.service';

describe('CategoryItemsService', () => {
  let service: CategoryItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryItemsService],
    }).compile();

    service = module.get<CategoryItemsService>(CategoryItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
