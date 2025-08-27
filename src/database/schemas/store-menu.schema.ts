import { products } from '@/database/schemas/product.schema';
import { stores } from '@/database/schemas/store.schema';
import { relations } from 'drizzle-orm';
import { index, integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const storeMenus = pgTable(
  'store_menus',
  {
    id: serial().primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    deletedAt: timestamp('deleted_at'),
    storeId: integer('store_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    index: integer('index'),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('store_menus_name_idx').on(table.name)],
);

export const storeMenusRelations = relations(storeMenus, ({ one, many }) => ({
  store: one(stores, {
    fields: [storeMenus.storeId],
    references: [stores.id],
  }),
  products: many(products),
}));

export type StoreMenu = typeof storeMenus.$inferSelect;
