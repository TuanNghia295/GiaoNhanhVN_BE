import { categoryItems } from '@/database/schemas/category-item.schema';
import { extras } from '@/database/schemas/extra.schema';
import { options } from '@/database/schemas/option.schema';
import { storeMenus } from '@/database/schemas/store-menu.schema';
import { stores } from '@/database/schemas/store.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const products = pgTable(
  'products',
  {
    id: serial().primaryKey().notNull(),
    name: varchar('name'),
    price: numeric('price', {
      precision: 15,
      scale: 2,
      mode: 'number',
    }).notNull(),
    image: text('image'),
    quantity: integer('quantity').default(0),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    description: text('description'),
    salePrice: numeric('sale_price', {
      precision: 15,
      scale: 2,
      mode: 'number',
    }),
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
  },
  (table) => [
    index('products_name_idx').on(table.name),
    index('products_store_id_idx').on(table.storeId),
    index('products_category_item_id_idx').on(table.categoryItemId),
    index('products_store_menu_id_deleted_at_locked_idx').on(
      table.storeMenuId,
      table.deletedAt,
      table.isLocked,
    ),
    index('products_store_menu_id_created_at_idx').on(table.storeMenuId, table.createdAt),
  ],
);

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
