// banks.schema.ts - Drizzle ORM (PostgreSQL)
import { delivers } from '@/database/schemas/deliver.schema';
import { relations } from 'drizzle-orm';
import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const banks = pgTable('banks', {
  id: integer().primaryKey(),
  nameBank: varchar('name_bank', { length: 255 }),
  accountNumber: varchar('account_number', { length: 255 }),
  accountName: varchar('account_name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  authorId: integer('author_id').unique().notNull(),
});

export const banksRelations = relations(banks, ({ one }) => ({
  author: one(delivers, {
    fields: [banks.authorId],
    references: [delivers.id],
  }),
}));
