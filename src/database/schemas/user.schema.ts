import { fcmTokens } from '@/database/schemas/fcmToken.schema';
import { notificationsToUsers } from '@/database/schemas/notification.schema';
import { orders } from '@/database/schemas/order.schema';
import { storeRequests } from '@/database/schemas/store-request.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export enum RoleEnum {
  ADMIN = 'ADMIN',
  USER = 'USER',
  STORE = 'STORE',
  MANAGEMENT = 'MANAGEMENT',
  DELIVER = 'DELIVER',
}

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  phone: varchar({ length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }),
  role: varchar('role').notNull().$type<RoleEnum>().default(RoleEnum.USER),
  password: varchar({ length: 255 }),
  avatar: varchar({ length: 255 }),
  dateOfBirth: timestamp('date_of_birth'),
  gender: varchar({ length: 255 }),
  email: varchar({ length: 255 }),
  isLocked: boolean('is_locked').notNull().default(false),
  fcmToken: varchar('fcm_token', { length: 255 }),
  refreshToken: varchar('refresh_token', { length: 255 }),
  deletedAt: timestamp('deleted_at'),
  // lượt quay
  count: integer('count').notNull().default(0),
  // xu
  coin: integer().notNull().default(0),

  areaId: integer('area_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/*******************************************************************
 * Relations Users with Sessions - One to Many
 *******************************************************************/
export const usersRelations = relations(users, ({ many }) => ({
  storeRequests: many(storeRequests),
  orders: many(orders),
  notifications: many(notificationsToUsers),
  fcmTokens: many(fcmTokens),
}));

export type User = typeof users.$inferSelect;
