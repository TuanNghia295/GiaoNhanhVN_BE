import { categories } from '@/database/schemas/category.schema';
import { products } from '@/database/schemas/product.schema';
import { storesToCategoryItems } from '@/database/schemas/store.schema';
import { relations } from 'drizzle-orm';
import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const categoryItems = pgTable('category_items', {
  id: serial().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),

  categoryId: serial('category_id').notNull(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const categoryItemsRelations = relations(
  categoryItems,
  ({ one, many }) => ({
    category: one(categories, {
      fields: [categoryItems.categoryId],
      references: [categories.id],
    }),
    products: many(products),
    storesToCategoryItems: many(storesToCategoryItems),
  }),
);

export type CategoryItem = typeof categoryItems.$inferSelect;
