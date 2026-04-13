import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const zalo = pgTable('zalo', {
  id: serial('id').primaryKey().notNull(),
  appId: varchar('app_id', { length: 255 }).notNull(),
  appSecret: varchar('app_secret', { length: 255 }).notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Zalo = typeof zalo.$inferSelect;
