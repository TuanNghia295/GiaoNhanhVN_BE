import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { commentsToRatings } from './comments-to-ratings.schema';

export enum CommentTypeEnum {
  STORE = 'STORE', // món ăn
  DELIVER = 'DELIVER', // giao hàng
}

export const comments = pgTable('comments', {
  id: serial().primaryKey(),
  comment: text(),
  type: varchar().notNull().$type<CommentTypeEnum>(),
  //! cột này sẽ bỏ
  commentUsedId: integer(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const commentsRelations = relations(comments, ({ many }) => ({
  ratings: many(commentsToRatings),
}));
