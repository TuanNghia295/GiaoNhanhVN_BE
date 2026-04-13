import { comments } from '@/database/schemas/comment.schema';
import { ratings } from '@/database/schemas/rating.schema';
import { relations } from 'drizzle-orm';
import { integer, pgTable } from 'drizzle-orm/pg-core';

export const commentsToRatings = pgTable(
  'comments_to_ratings',
  {
    id: integer(),
    commentId: integer('comment_id')
      .notNull()
      .references(() => comments.id),
    ratingId: integer('rating_id')
      .notNull()
      .references(() => ratings.id),
  },
  (t) => ({
    primaryKey: [t.commentId, t.ratingId],
  }),
);

export const commentsToRatingsRelations = relations(commentsToRatings, ({ one }) => ({
  comment: one(comments, {
    fields: [commentsToRatings.commentId],
    references: [comments.id],
  }),
  rating: one(ratings, {
    fields: [commentsToRatings.ratingId],
    references: [ratings.id],
  }),
}));

export type CommentsToRatings = typeof commentsToRatings;
