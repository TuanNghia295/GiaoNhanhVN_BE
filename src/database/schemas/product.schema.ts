import { categoryItems } from '@/database/schemas/category-item.schema';
import { extras } from '@/database/schemas/extra.schema';
import { options } from '@/database/schemas/option.schema';
import { storeMenus } from '@/database/schemas/store-menu.schema';
import { stores } from '@/database/schemas/store.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial().primaryKey().notNull(),
  name: varchar('name'),
  nameNormalized: varchar('name_normalized'),
  price: decimal('price', {
    precision: 15,
    scale: 2,
    mode: 'number',
  }).notNull(),
  image: text('image'),
  description: text('description'),
  isLocked: boolean('is_locked').default(false),
  categoryItemId: integer('category_item_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at'),
  storeId: integer('store_id'),
  storeMenuId: integer('store_menu_id'),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  categoryItem: one(categoryItems, {
    fields: [products.categoryItemId],
    references: [categoryItems.id],
  }),
  options: many(options),
  extras: many(extras),
  storeMenu: one(storeMenus, {
    fields: [products.storeMenuId],
    references: [storeMenus.id],
  }),
}));

export const category_item_on_products = pgTable(
  'category_item_on_products',
  {
    productId: integer('productId').notNull(),
    categoryItemId: integer('categoryItemId').notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryItemId] })],
);

export type Product = typeof products.$inferSelect;
