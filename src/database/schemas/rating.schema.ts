import { commentsToRatings } from '@/database/schemas/comments-to-ratings.schema';
import { orders } from '@/database/schemas/order.schema';
import { stores } from '@/database/schemas/store.schema';
import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';

export const ratings = pgTable('ratings', {
  id: serial().primaryKey().notNull(),
  storeRate: integer('store_rate'),
  deliverRate: integer('deliver_rate'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  orderId: integer('order_id').notNull(),
  userId: integer('user_id').notNull(),
  storeId: integer('store_id'),
  deliverId: integer('deliver_id'),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const ratingsRelations = relations(ratings, ({ one, many }) => ({
  store: one(stores, {
    fields: [ratings.storeId],
    references: [stores.id],
  }),
  order: one(orders, {
    fields: [ratings.orderId],
    references: [orders.id],
  }),
  commentUsed: many(commentsToRatings),
}));
