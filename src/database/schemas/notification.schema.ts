import { areas } from '@/database/schemas/area.schema';
import { users } from '@/database/schemas/user.schema';
import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export enum NotificationTypeEnum {
  SYSTEM = 'SYSTEM',
  ANOTHER = 'ANOTHER',
  ADMIN = 'ADMIN',
}

export const notifications = pgTable('notifications', {
  id: serial().primaryKey().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: varchar('body', { length: 255 }).notNull(),
  image: varchar('image', { length: 255 }),
  userId: integer('user_id'),
  type: varchar('type', { length: 50 }).$type<NotificationTypeEnum>(),
  areaId: integer('area_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type NotificationType = typeof notifications.$inferSelect;

export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  area: one(areas, {
    fields: [notifications.areaId],
    references: [areas.id],
  }),
  notificationsToUsers: many(notificationsToUsers),
  users: many(notificationsToUsers),
}));

export const notificationsToUsers = pgTable('notifications_to_users', {
  id: serial().primaryKey().notNull(),
  notificationId: integer('notification_id').notNull(),
  userId: integer('user_id').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const notificationsToUsersRelations = relations(notificationsToUsers, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationsToUsers.notificationId],
    references: [notifications.id],
  }),
  user: one(users, {
    fields: [notificationsToUsers.userId],
    references: [users.id],
  }),
}));
