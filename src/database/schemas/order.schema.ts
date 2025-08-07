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
  index,
  integer,
  numeric,
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

export const orders = pgTable(
  'orders',
  {
    id: serial().primaryKey(),
    type: varchar('type', { length: 20 }).notNull().default(OrderTypeEnum.FOOD),
    code: varchar('code', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 })
      .notNull()
      .$type<OrderStatusEnum>()
      .default(OrderStatusEnum.PENDING),

    coinUsed: numeric('coin_used', {
      precision: 15,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    totalVoucherStore: numeric('total_voucher_store', {
      precision: 15,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    totalVoucherApp: numeric('total_voucher_app', {
      precision: 15,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    deliveryIncomeTax: numeric('delivery_income_tax', {
      precision: 15,
      scale: 3,
      mode: 'number',
    })
      .notNull()
      .default(0),
    totalProductTax: numeric('total_product_tax', {
      precision: 15,
      scale: 3,
      mode: 'number',
    })
      .notNull()
      .default(0),
    isNight: boolean('is_night').notNull().default(false),
    isRain: boolean('is_rain').notNull().default(false),
    nightFee: numeric('night_fee', { precision: 15, scale: 3, mode: 'number' })
      .notNull()
      .default(0),
    rainFee: numeric('rain_fee', { precision: 15, scale: 2, mode: 'number' }).notNull().default(0),
    distance: numeric('distance', { precision: 15, scale: 2, mode: 'number' }).notNull().default(0),
    totalDelivery: numeric('total_delivery', {
      precision: 15,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    totalProduct: numeric('total_product', {
      precision: 15,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    totalVoucher: numeric('total_voucher', {
      precision: 15,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    userServiceFee: numeric('user_service_fee', {
      precision: 15,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    storeServiceFee: numeric('store_service_fee', {
      precision: 15,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    total: numeric('total', { precision: 15, scale: 2, mode: 'number' }).notNull().default(0),
    incomeDeliver: numeric('income_deliver', {
      precision: 15,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    payforShop: numeric('payfor_shop', {
      precision: 15,
      scale: 3,
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
  },
  (table) => [
    index('orders_code_index').on(table.code),
    index('orders_user_id_idx').on(table.userId),
    index('orders_deliver_id_idx').on(table.deliverId),
    index('orders_area_status_created_idx').on(table.areaId, table.status, table.createdAt),
    index('orders_store_status_idx').on(table.storeId, table.status),
    index('orders_created_at_idx').on(table.createdAt),

    index('orders_type_idx').on(table.type),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  area: one(areas, {
    fields: [orders.areaId],
    references: [areas.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
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
  reasonDeliverCancelOrder: many(reasonDeliverCancelOrders),
}));

export type Order = typeof orders.$inferSelect & {
  user?: typeof users.$inferSelect;
  deliver?: typeof delivers.$inferSelect;
};
