import { Test, TestingModule } from '@nestjs/testing';
import { CommentInRatingsService } from './comment-in-ratings.service';

describe('CommentInRatingsService', () => {
  let service: CommentInRatingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommentInRatingsService],
    }).compile();

    service = module.get<CommentInRatingsService>(CommentInRatingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
