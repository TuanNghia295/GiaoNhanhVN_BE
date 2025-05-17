import { Test, TestingModule } from '@nestjs/testing';
import { CategoryItemsController } from './category-items.controller';
import { CategoryItemsService } from './category-items.service';

describe('CategoryItemsController', () => {
  let controller: CategoryItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryItemsController],
      providers: [CategoryItemsService],
    }).compile();

    controller = module.get<CategoryItemsController>(CategoryItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
