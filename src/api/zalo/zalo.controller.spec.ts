import { Test, TestingModule } from '@nestjs/testing';
import { ZaloController } from './zalo.controller';
import { ZaloService } from './zalo.service';

describe('ZaloController', () => {
  let controller: ZaloController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZaloController],
      providers: [ZaloService],
    }).compile();

    controller = module.get<ZaloController>(ZaloController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
