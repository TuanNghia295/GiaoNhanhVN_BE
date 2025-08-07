import { areas } from '@/database/schemas/area.schema';
import { users } from '@/database/schemas/user.schema';
import { relations } from 'drizzle-orm';
import { integer, numeric, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';

export const coinLogs = pgTable('coin_logs', {
  id: serial().primaryKey(),
  userId: integer('user_id').notNull(),
  coin: numeric('coin', { precision: 15, scale: 2, mode: 'number' }),
  // khu vực nào nạp
  areaId: integer('area_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const coinLogsRelations = relations(coinLogs, ({ one }) => ({
  user: one(users, {
    fields: [coinLogs.userId],
    references: [users.id],
  }),
  area: one(areas, {
    fields: [coinLogs.areaId],
    references: [areas.id],
  }),
}));
