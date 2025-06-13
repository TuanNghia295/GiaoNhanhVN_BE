import { areas } from '@/database/schemas/area.schema';
import { bankRecords } from '@/database/schemas/bank-record.schema';
import { delivers } from '@/database/schemas/deliver.schema';
import { managers } from '@/database/schemas/manager.schema';
import { relations } from 'drizzle-orm';
import {
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export enum TransactionTypeEnum {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

// loại gửi yêu cầu / chuyển thẳng
export enum TransactionMethodEnum {
  // gửi yêu cầu
  REQUEST = 'REQUEST',
  // chuyển thẳng
  TRANSFER = 'TRANSFER',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const transactions = pgTable('transactions', {
  id: serial().primaryKey().notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  amount: decimal('amount', {
    precision: 15,
    scale: 2,
    mode: 'number',
  }).notNull(),
  method: varchar('method', { length: 50 }).$type<TransactionMethodEnum>(),
  status: varchar('status', { length: 50 })
    .notNull()
    .default(TransactionStatus.PENDING),
  rejectedReason: text('rejected_reason'),
  approvedBy: integer('approved_by'),
  role: varchar('role', { length: 50 }),
  areaId: integer('area_id'),
  managerId: integer('manager_id'),
  deliverId: integer('deliver_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  area: one(areas, {
    fields: [transactions.areaId],
    references: [areas.id],
  }),
  manager: one(managers, {
    fields: [transactions.managerId],
    references: [managers.id],
  }),
  deliver: one(delivers, {
    fields: [transactions.deliverId],
    references: [delivers.id],
  }),
  bank: one(bankRecords),
}));

export type TransactionType = typeof transactions.$inferSelect;
