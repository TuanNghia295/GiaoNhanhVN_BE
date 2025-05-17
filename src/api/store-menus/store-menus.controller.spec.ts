import { Test, TestingModule } from '@nestjs/testing';
import { StoreMenusController } from './store-menus.controller';
import { StoreMenusService } from './store-menus.service';

describe('StoreMenusController', () => {
  let controller: StoreMenusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreMenusController],
      providers: [StoreMenusService],
    }).compile();

    controller = module.get<StoreMenusController>(StoreMenusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
