import { orders } from '@/database/schemas/order.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  integer,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export enum VouchersTypeEnum {
  ADMIN = 'ADMIN',
  STORE = 'STORE',
  MANAGEMENT = 'MANAGEMENT',
}

export enum VouchersStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

export const vouchers = pgTable('vouchers', {
  id: serial('id').primaryKey().notNull(),
  code: varchar('code').notNull(),
  value: decimal('value', {
    precision: 10,
    scale: 2,
    mode: 'number',
  }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  maxUses: integer('max_uses').notNull(),
  usePerUser: integer('use_per_user').notNull(),
  // usedCount: integer('used_count').default(0).notNull(),
  status: varchar('status', { length: 50 })
    .notNull()
    .$type<VouchersStatusEnum>()
    .default(VouchersStatusEnum.ACTIVE),
  description: varchar('description', { length: 255 }),
  managerId: integer('manager_id'),
  userId: integer('user_id'),
  deletedAt: timestamp('deleted_at'),
  isHidden: boolean('is_hidden').default(false).notNull(),
  minOrderValue: decimal('min_order_value', {
    precision: 10,
    scale: 2,
    mode: 'number',
  }).default(0),
  maxOrderValue: decimal('max_order_value', {
    precision: 10,
    scale: 2,
    mode: 'number',
  }).default(0),
  areaId: integer('area_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const vouchersRelations = relations(vouchers, ({ many }) => ({
  orders: many(vouchersOnOrders),
}));

export const vouchersOnOrders = pgTable(
  'vouchers_on_orders',
  {
    orderId: integer('order_id').notNull(),
    voucherId: integer('voucher_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.voucherId] })],
);

export const vouchersOnOrdersRelations = relations(
  vouchersOnOrders,
  ({ one }) => ({
    voucher: one(vouchers, {
      fields: [vouchersOnOrders.voucherId],
      references: [vouchers.id],
    }),
    order: one(orders, {
      fields: [vouchersOnOrders.orderId],
      references: [orders.id],
    }),
  }),
);

export type Voucher = typeof vouchers.type;
