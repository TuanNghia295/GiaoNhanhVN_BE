import { RoleEnum } from '@/database/schemas';
import { CommentTypeEnum } from '@/database/schemas/comment.schema';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import { Controller, Get, Param } from '@nestjs/common';
import { CommentInRatingsService } from './comment-in-ratings.service';

@Controller('comment-in-ratings')
export class CommentInRatingsController {
  constructor(private readonly commentInRatingsService: CommentInRatingsService) {}

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Lấy danh sách bình luận trong đánh giá (user)',
  })
  @Get('list/:type')
  async getCommentsByType(@Param('type') type: CommentTypeEnum) {
    return await this.commentInRatingsService.getCommentsByType(type);
  }
}
