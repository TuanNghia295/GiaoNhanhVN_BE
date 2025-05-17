import { Test, TestingModule } from '@nestjs/testing';
import { DeliversService } from './delivers.service';

describe('DeliversService', () => {
  let service: DeliversService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliversService],
    }).compile();

    service = module.get<DeliversService>(DeliversService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
