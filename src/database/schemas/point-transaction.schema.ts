import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export enum PointTransactionTypeEnum {
  CREATE_VOUCHER = 'CREATE_VOUCHER', // Tạo voucher
  REMOVE_VOUCHER = 'REMOVE_VOUCHER', // Xóa voucher
  ADD_POINT_DELIVER = 'ADD_POINT_DELIVER', // Thêm điểm cho giao hàng
  SUBTRACT_POINT_DELIVER = 'SUBTRACT_POINT_DELIVER', // Trừ điểm giao hàng
}

export const pointTransactions = pgTable('point_transactions', {
  id: serial().primaryKey(),
  deliverId: integer('deliver_id'),
  managerId: integer('manager_id'),
  type: text('type').notNull(), // 'ADD' or 'SUBTRACT'
  point: numeric('point', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
