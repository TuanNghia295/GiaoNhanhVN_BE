import { extrasToOrderDetails } from '@/database/schemas/extra.schema';
import { optionGroupOptions, optionGroups } from '@/database/schemas/option-group.schema';
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
      name: 'order_details_order_id_orders_pk',
      columns: [table.orderId],
      foreignColumns: [orders.id],
    })
      .onUpdate('no action')
      .onDelete('cascade'),
  ],
);

export const orderDetailSelectedOptions = pgTable(
  'order_detail_selected_options',
  {
    id: serial('id').primaryKey().notNull(),
    orderDetailId: integer('order_detail_id')
      .notNull()
      .references(() => orderDetails.id, { onDelete: 'cascade' }),
    optionGroupId: integer('option_group_id')
      .notNull()
      .references(() => optionGroups.id, { onDelete: 'cascade' }),
    optionGroupOptionId: integer('option_group_option_id')
      .notNull()
      .references(() => optionGroupOptions.id, { onDelete: 'restrict' }),
    price: numeric('price', { precision: 15, scale: 2, mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('order_detail_selected_options_detail_id_idx').on(table.orderDetailId),
    index('order_detail_selected_options_option_idx').on(table.optionGroupOptionId),
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
  selectedOptions: many(orderDetailSelectedOptions),
  extras: many(extrasToOrderDetails),
}));

export const orderDetailSelectedOptionsRelations = relations(
  orderDetailSelectedOptions,
  ({ one }) => ({
    orderDetail: one(orderDetails, {
      fields: [orderDetailSelectedOptions.orderDetailId],
      references: [orderDetails.id],
    }),
    optionGroupOption: one(optionGroupOptions, {
      fields: [orderDetailSelectedOptions.optionGroupOptionId],
      references: [optionGroupOptions.id],
    }),
  }),
);
