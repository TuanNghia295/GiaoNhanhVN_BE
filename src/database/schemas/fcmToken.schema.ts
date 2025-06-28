import { users } from '@/database/schemas/user.schema';
import { relations } from 'drizzle-orm';
import { integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const fcmTokens = pgTable(
  'fcm_tokens',
  {
    token: text('token').notNull(),
    platform: text('platform').default('unknown'), // e.g., android, ios, web
    deviceInfo: text('device_info'), // Optional: user-agent/device-id
    userId: integer('user_id').notNull(), // Reference to the user
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.token] }), // mỗi user-token là unique
  }),
);

export type FcmToken = typeof fcmTokens;

export const fcmTokensRelations = relations(fcmTokens, ({ one }) => ({
  user: one(users, {
    fields: [fcmTokens.userId],
    references: [users.id],
  }),
}));
