import { extrasToOrderDetails } from '@/database/schemas/extra.schema';
import { options } from '@/database/schemas/option.schema';
import { orders } from '@/database/schemas/order.schema';
import { products } from '@/database/schemas/product.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const orderDetails = pgTable(
  'order_details',
  {
    id: serial('id').primaryKey().notNull(),
    quantity: integer('quantity').notNull(),
    total: decimal('total', { precision: 15, scale: 2, mode: 'number' })
      .$type<number>()
      .notNull()
      .default(0),
    // check sale
    isSale: boolean('is_sale').default(false),
    // lưu lại giá sale
    salePrice: numeric('sale_price', { precision: 15, scale: 2, mode: 'number' }).default(0),
    optionId: integer('option_id'),
    productId: integer('product_id'),
    orderId: integer('order_id'),
    userId: integer('user_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('order_details_order_id_idx').on(table.orderId),
    index('order_details_product_id_idx').on(table.productId),
    index('order_details_option_id_idx').on(table.optionId),
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

export const orderDetailsRelations = relations(orderDetails, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderDetails.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [orderDetails.userId],
    references: [users.id],
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
}));
