import { Test, TestingModule } from '@nestjs/testing';
import { DeliversController } from './delivers.controller';
import { DeliversService } from './delivers.service';

describe('DeliversController', () => {
  let controller: DeliversController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliversController],
      providers: [DeliversService],
    }).compile();

    controller = module.get<DeliversController>(DeliversController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
