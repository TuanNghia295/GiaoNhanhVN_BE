import { products } from '@/database/schemas/product.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const optionGroups = pgTable(
  'option_groups',
  {
    id: serial('id').primaryKey().notNull(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    displayName: varchar('display_name', { length: 150 }),
    isRequired: boolean('is_required').notNull().default(true),
    minSelect: integer('min_select').notNull().default(1),
    maxSelect: integer('max_select').notNull().default(1),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('idx_option_groups_product_id').on(table.productId)],
);

export const optionGroupOptions = pgTable(
  'option_group_options',
  {
    id: serial('id').primaryKey().notNull(),
    optionGroupId: integer('option_group_id')
      .notNull()
      .references(() => optionGroups.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    price: numeric('price', { precision: 15, scale: 2, mode: 'number' }).notNull().default(0),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('idx_option_group_options_group_id').on(table.optionGroupId)],
);

export const optionGroupsRelations = relations(optionGroups, ({ one, many }) => ({
  product: one(products, {
    fields: [optionGroups.productId],
    references: [products.id],
  }),
  options: many(optionGroupOptions),
}));

export const optionGroupOptionsRelations = relations(optionGroupOptions, ({ one }) => ({
  group: one(optionGroups, {
    fields: [optionGroupOptions.optionGroupId],
    references: [optionGroups.id],
  }),
}));
