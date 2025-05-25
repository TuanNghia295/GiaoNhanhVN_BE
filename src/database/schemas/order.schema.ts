import { areas } from '@/database/schemas/area.schema';
import { delivers } from '@/database/schemas/deliver.schema';
import { orderDetails } from '@/database/schemas/order-detail.schema';
import { reasonDeliverCancelOrders } from '@/database/schemas/reason-deliver-cancel-order.schema';
import { stores } from '@/database/schemas/store.schema';
import { users } from '@/database/schemas/user.schema';
import { vouchersOnOrders } from '@/database/schemas/voucher.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export enum OrderTypeEnum {
  FOOD = 'FOOD', // món ăn
  DELIVERY = 'DELIVERY', // giao hàng
  TRANSPORTATION = 'TRANSPORTATION', // xe ôm
  ANOTHER_SHOP = 'ANOTHER_SHOP', // gIao hàng cho shop
}

export enum OrderStatusEnum {
  PENDING = 'PENDING', // chờ xác nhận
  ACCEPTED = 'ACCEPTED', // đã xác nhận
  DELIVERING = 'DELIVERING', // đang giao hàng
  DELIVERED = 'DELIVERED', // đã giao hàng
  CANCELED = 'CANCELED', // đã hủy
}

export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  type: varchar('type', { length: 20 }).notNull().default(OrderTypeEnum.FOOD),
  code: varchar('code', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 })
    .notNull()
    .$type<OrderStatusEnum>()
    .default(OrderStatusEnum.PENDING),
  isHoliday: boolean('is_holiday').notNull().default(false),
  isRain: boolean('is_rain').notNull().default(false),
  distance: decimal('distance', { precision: 15, scale: 2, mode: 'number' })
    .notNull()
    .default(0),
  totalDelivery: decimal('total_delivery', {
    precision: 15,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  totalProduct: decimal('total_product', {
    precision: 15,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  totalVoucher: decimal('total_voucher', {
    precision: 15,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  userServiceFee: decimal('user_service_fee', {
    precision: 15,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  storeServiceFee: decimal('store_service_fee', {
    precision: 15,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  total: decimal('total', { precision: 15, scale: 2, mode: 'number' })
    .notNull()
    .default(0),
  incomeDeliver: decimal('income_deliver', {
    precision: 15,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  payforShop: decimal('payfor_shop', {
    precision: 15,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  isRated: boolean('is_rated').notNull().default(false),
  addressFrom: varchar('address_from', { length: 255 }).notNull(),
  geometryFrom: varchar('geometry_from', { length: 255 }).notNull(),

  addressTo: varchar('address_to', { length: 255 }).notNull(),
  geometryTo: varchar('geometry_to', { length: 255 }).notNull(),

  nameForContact: varchar('user_for_contact', { length: 255 }),
  phoneForContact: varchar('phone_for_contact', { length: 20 }),
  note: text(),
  userId: integer('user_id'),
  deliverId: integer('deliver_id'),
  storeId: integer('store_id'),
  areaId: integer('area_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  area: one(areas, {
    fields: [orders.areaId],
    references: [areas.id],
  }),
  deliver: one(delivers, {
    fields: [orders.deliverId],
    references: [delivers.id],
  }),
  orderDetails: many(orderDetails),
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  vouchers: many(vouchersOnOrders),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  reasonDeliverCancelOrder: many(reasonDeliverCancelOrders),
}));

export type Order = typeof orders.$inferSelect;
