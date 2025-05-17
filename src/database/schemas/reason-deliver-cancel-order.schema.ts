import { orders } from '@/database/schemas/order.schema';
import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export enum CanceledReasonEnum {
  CANCELED = 'CANCELED',
  NOTTAKEN = 'NOTTAKEN',
}

export const reasonDeliverCancelOrders = pgTable(
  'reason_deliver_cancel_orders',
  {
    id: serial('id').primaryKey().notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    reason: varchar('reason', { length: 255 }).notNull(),
    orderId: integer('order_id').notNull(),
    deliverId: integer('deliver_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
);

export const reasonDeliverCancelOrdersRelations = relations(
  reasonDeliverCancelOrders,
  ({ one }) => ({
    // Add any relations if necessary
    order: one(orders, {
      fields: [reasonDeliverCancelOrders.orderId],
      references: [orders.id],
    }),
  }),
);
