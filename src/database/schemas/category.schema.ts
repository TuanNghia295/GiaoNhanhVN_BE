import { categoryItems } from '@/database/schemas/category-item.schema';
import { relations } from 'drizzle-orm';
import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: serial().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  categoryItems: many(categoryItems),
}));
