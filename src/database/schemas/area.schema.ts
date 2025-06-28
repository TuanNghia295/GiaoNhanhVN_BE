import { delivers } from '@/database/schemas/deliver.schema';
import { managers } from '@/database/schemas/manager.schema';
import { notifications } from '@/database/schemas/notification.schema';
import { orders } from '@/database/schemas/order.schema';
import { storeRequests } from '@/database/schemas/store-request.schema';
import { users } from '@/database/schemas/user.schema';
import { relations } from 'drizzle-orm';
import { decimal, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const areas = pgTable('areas', {
  id: serial().primaryKey().notNull(),
  name: varchar('name').notNull(),
  code: varchar('code', { length: 100 }).notNull(),
  parent: varchar('parent'),
  point: decimal('point', { precision: 15, scale: 2, mode: 'number' }).notNull().default(0),
  location: varchar('location', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const areasRelations = relations(areas, ({ many }) => ({
  managers: many(managers),
  delivers: many(delivers),
  storeRequest: many(storeRequests),
  notifications: many(notifications),
  orders: many(orders),
  users: many(users),
}));

export type Area = typeof areas.$inferSelect;
