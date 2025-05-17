import { areas } from '@/database/schemas/area.schema';
import { users } from '@/database/schemas/user.schema';
import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export enum StoreRequestStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const storeRequests = pgTable('store_requests', {
  id: serial().primaryKey().notNull(),
  status: varchar('status', { length: 20 })
    .notNull()
    .default(StoreRequestStatusEnum.PENDING)
    .$type<StoreRequestStatusEnum>(),
  userId: integer('user_id'),
  areaId: integer('area_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/*******************************************************************
 * Relations Store Requests with Users - Many to One
 *******************************************************************/

export const storeRequestsRelations = relations(storeRequests, ({ one }) => ({
  user: one(users, {
    fields: [storeRequests.userId],
    references: [users.id],
  }),
  area: one(areas, {
    fields: [storeRequests.areaId],
    references: [areas.id],
  }),
}));
