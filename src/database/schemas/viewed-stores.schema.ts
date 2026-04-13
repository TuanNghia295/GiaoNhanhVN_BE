import { stores } from '@/database/schemas/store.schema';
import { relations } from 'drizzle-orm';
import { integer, pgTable, primaryKey, timestamp } from 'drizzle-orm/pg-core';

export const viewedStores = pgTable(
  'viewed_stores',
  {
    userId: integer('user_id').notNull(),
    storeId: integer('store_id').notNull(),
    lastViewedAt: timestamp('last_viewed_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.userId] })],
);

export type ViewedStore = typeof viewedStores.$inferSelect;

export const viewedStoresRelations = relations(viewedStores, ({ one }) => ({
  store: one(stores, {
    fields: [viewedStores.storeId],
    references: [stores.id],
  }),
}));
