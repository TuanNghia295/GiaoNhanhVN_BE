import { Test, TestingModule } from '@nestjs/testing';
import { ExcelsService } from './excels.service';

describe('ExcelsService', () => {
  let service: ExcelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExcelsService],
    }).compile();

    service = module.get<ExcelsService>(ExcelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
