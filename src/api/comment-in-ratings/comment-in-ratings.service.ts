import { DRIZZLE } from '@/database/global';
import { comments, CommentTypeEnum } from '@/database/schemas/comment.schema';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

@Injectable()
export class CommentInRatingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getCommentsByType(type: CommentTypeEnum) {
    return this.db
      .select()
      .from(comments)
      .where(eq(comments.type, type))
      .orderBy(desc(comments.createdAt));
  }
}
