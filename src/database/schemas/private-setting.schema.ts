import { integer, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';

export const privateSetting = pgTable('private_setting', {
  id: serial().primaryKey().notNull(),
  numberStores: integer('number_stores'), // Số lượng cửa hàng
  numberRadius: integer('number_radius'), // Bán kính tìm kiếm cửa hàng
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type PrivateSetting = typeof privateSetting.$inferSelect;
