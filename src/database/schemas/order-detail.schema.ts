import { extrasToOrderDetails } from '@/database/schemas/extra.schema';
import { options } from '@/database/schemas/option.schema';
import { orders } from '@/database/schemas/order.schema';
import { products } from '@/database/schemas/product.schema';
import { relations } from 'drizzle-orm';
import {
  decimal,
  foreignKey,
  integer,
  pgTable,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';

export const orderDetails = pgTable(
  'order_details',
  {
    id: serial('id').primaryKey().notNull(),
    quantity: integer('quantity').notNull(),
    total: decimal('total', { precision: 15, scale: 2, mode: 'number' })
      .$type<number>()
      .notNull()
      .default(0),
    optionId: integer('option_id'),
    productId: integer('product_id'),
    orderId: integer('order_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      // managers_areaId_areas_fk
      name: 'order_details_order_id_orders_pk',
      columns: [table.orderId],
      foreignColumns: [orders.id],
    })
      .onUpdate('no action')
      .onDelete('cascade'),
  ],
);

export const orderDetailsRelations = relations(
  orderDetails,
  ({ one, many }) => ({
    order: one(orders, {
      fields: [orderDetails.orderId],
      references: [orders.id],
    }),
    product: one(products, {
      fields: [orderDetails.productId],
      references: [products.id],
    }),
    option: one(options, {
      fields: [orderDetails.optionId],
      references: [options.id],
    }),
    extras: many(extrasToOrderDetails),
  }),
);
