import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const transactionLogs = pgTable('transaction_logs', {
  id: serial().primaryKey(),
  areaId: integer('area_id'),
  // deliverId: integer('deliver_id'),
  // managerId: integer('manager_id'),
  type: text('type').notNull(), // 'ADD' or 'SUBTRACT'
  point: numeric('point', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
