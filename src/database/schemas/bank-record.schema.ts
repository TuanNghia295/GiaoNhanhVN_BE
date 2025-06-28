import { transactions } from '@/database/schemas/transaction.schema';
import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const bankRecords = pgTable('bank_records', {
  id: serial().primaryKey(),
  nameBank: varchar('name_bank', { length: 255 }),
  accountNumber: varchar('account_number', { length: 255 }),
  accountName: varchar('account_name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  transactionId: integer('transaction_id'),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const bankRecordsRelations = relations(bankRecords, ({ one }) => ({
  transaction: one(transactions, {
    fields: [bankRecords.transactionId],
    references: [transactions.id],
  }),
}));
