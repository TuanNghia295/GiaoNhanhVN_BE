import { categoryItems } from '@/database/schemas/category-item.schema';
import { orders } from '@/database/schemas/order.schema';
import { products } from '@/database/schemas/product.schema';
import { storeMenus } from '@/database/schemas/store-menu.schema';
import { users } from '@/database/schemas/user.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const stores = pgTable('stores', {
  id: serial('id').primaryKey().notNull(),
  name: varchar({ length: 100 }),
  description: varchar({ length: 255 }),
  address: varchar({ length: 255 }),
  location: varchar({ length: 255 }),
  avatar: varchar({ length: 255 }),
  background: varchar({ length: 255 }),

  rating: numeric('rating', { precision: 2, scale: 1, mode: 'number' }).default(
    0,
  ),
  bestSeller: varchar('best_seller', { length: 255 }),
  // locationMap: geometry('location_map', {
  //   type: 'point',
  //   mode: 'xy',
  //   srid: 4326,
  // }),
  openTime: timestamp('open_time'),
  closeTime: timestamp('close_time'),
  openSecondTime: timestamp('open_second_time'),
  closeSecondTime: timestamp('close_second_time'),
  isLocked: boolean('is_locked').notNull().default(false),
  status: boolean('status').notNull().default(true),
  areaId: integer('area_id'),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const storesRelations = relations(stores, ({ one, many }) => ({
  user: one(users, {
    fields: [stores.userId],
    references: [users.id],
  }),
  storeMenus: many(storeMenus),
  products: many(products),
  orders: many(orders),
  storesToCategoryItems: many(storesToCategoryItems),
}));

export const storesToCategoryItems = pgTable(
  'stores_to_category_items',
  {
    storeId: integer('store_id')
      .notNull()
      .references(() => stores.id),
    categoryItemId: integer('category_item_id')
      .notNull()
      .references(() => categoryItems.id),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.categoryItemId] })],
);

export const storesToCategoryItemsRelations = relations(
  storesToCategoryItems,
  ({ one }) => ({
    store: one(stores, {
      fields: [storesToCategoryItems.storeId],
      references: [stores.id],
    }),
    categoryItem: one(categoryItems, {
      fields: [storesToCategoryItems.categoryItemId],
      references: [categoryItems.id],
    }),
  }),
);

export type Store = typeof stores.$inferSelect;
