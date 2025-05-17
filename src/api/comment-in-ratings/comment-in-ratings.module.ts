import { Module } from '@nestjs/common';
import { CommentInRatingsController } from './comment-in-ratings.controller';
import { CommentInRatingsService } from './comment-in-ratings.service';

@Module({
  controllers: [CommentInRatingsController],
  providers: [CommentInRatingsService],
})
export class CommentInRatingsModule {}
