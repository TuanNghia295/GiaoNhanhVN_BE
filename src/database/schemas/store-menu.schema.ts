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
  (table) => [
    index('store_menus_name_idx').on(table.name),
    // Index cho WHERE clause: storeId và deletedAt
    index('store_menus_store_id_deleted_at_idx').on(table.storeId, table.deletedAt),
    // Index cho ORDER BY mặc định: index và createdAt
    index('store_menus_store_id_deleted_at_index_created_at_idx').on(
      table.storeId,
      table.deletedAt,
      table.index,
      table.createdAt,
    ),
    // Index cho ORDER BY theo name
    index('store_menus_store_id_deleted_at_name_idx').on(
      table.storeId,
      table.deletedAt,
      table.name,
    ),
    // Index cho ORDER BY theo createdAt (newest/oldest)
    index('store_menus_store_id_deleted_at_created_at_idx').on(
      table.storeId,
      table.deletedAt,
      table.createdAt,
    ),
  ],
);

export const storeMenusRelations = relations(storeMenus, ({ one, many }) => ({
  store: one(stores, {
    fields: [storeMenus.storeId],
    references: [stores.id],
  }),
  products: many(products),
}));

export type StoreMenu = typeof storeMenus.$inferSelect;
