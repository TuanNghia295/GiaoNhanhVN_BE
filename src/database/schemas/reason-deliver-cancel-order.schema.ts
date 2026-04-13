import { delivers } from '@/database/schemas/deliver.schema';
import { orders } from '@/database/schemas/order.schema';
import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export enum CanceledReasonEnum {
  CANCELED = 'CANCELED',
}

export const reasonDeliverCancelOrders = pgTable('reason_deliver_cancel_orders', {
  id: serial('id').primaryKey().notNull(),
  type: varchar('type', { length: 255 })
    .notNull()
    .$type<CanceledReasonEnum>()
    .default(CanceledReasonEnum.CANCELED),
  reason: varchar('reason', { length: 255 }).notNull(),
  orderId: integer('order_id').notNull(),
  deliverId: integer('deliver_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const reasonDeliverCancelOrdersRelations = relations(
  reasonDeliverCancelOrders,
  ({ one }) => ({
    // Add any relations if necessary
    deliver: one(delivers, {
      fields: [reasonDeliverCancelOrders.deliverId],
      references: [delivers.id],
    }),
    order: one(orders, {
      fields: [reasonDeliverCancelOrders.orderId],
      references: [orders.id],
    }),
  }),
);
