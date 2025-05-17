import { products } from '@/database/schemas/product.schema';
import { relations } from 'drizzle-orm';
import {
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const options = pgTable('options', {
  id: serial('id').primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2, mode: 'number' })
    .notNull()
    .default(0),
  productId: integer('product_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const optionsRelations = relations(options, ({ one }) => ({
  product: one(products, {
    fields: [options.productId],
    references: [products.id],
  }),
}));
