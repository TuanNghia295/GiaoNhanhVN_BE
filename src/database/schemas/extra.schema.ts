import { orderDetails } from '@/database/schemas/order-detail.schema';
import { products } from '@/database/schemas/product.schema';
import { relations } from 'drizzle-orm';
import {
  decimal,
  integer,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const extras = pgTable('extras', {
  id: serial('id').primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2, mode: 'number' })
    .notNull()
    .$type<number>()
    .default(0),
  productId: integer('product_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const extrasRelations = relations(extras, ({ one, many }) => ({
  products: one(products, {
    fields: [extras.productId],
    references: [products.id],
  }),
  orderDetails: many(extrasToOrderDetails),
}));

export const extrasToOrderDetails = pgTable(
  'extras_to_order_details',
  {
    quantity: integer('quantity').notNull(),
    extraId: serial('extra_id')
      .notNull()
      .references(() => extras.id),
    orderDetailId: serial('order_detail_id')
      .notNull()
      .references(() => products.id),
  },
  (t) => [primaryKey({ columns: [t.extraId, t.orderDetailId] })],
);

export const extrasToOrderDetailsRelations = relations(
  extrasToOrderDetails,
  ({ one }) => ({
    extra: one(extras, {
      fields: [extrasToOrderDetails.extraId],
      references: [extras.id],
    }),
    orderDetails: one(orderDetails, {
      fields: [extrasToOrderDetails.orderDetailId],
      references: [orderDetails.id],
    }),
  }),
);
