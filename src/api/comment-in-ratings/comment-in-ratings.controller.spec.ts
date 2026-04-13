import { Test, TestingModule } from '@nestjs/testing';
import { CommentInRatingsController } from './comment-in-ratings.controller';
import { CommentInRatingsService } from './comment-in-ratings.service';

describe('CommentInRatingsController', () => {
  let controller: CommentInRatingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentInRatingsController],
      providers: [CommentInRatingsService],
    }).compile();

    controller = module.get<CommentInRatingsController>(CommentInRatingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
