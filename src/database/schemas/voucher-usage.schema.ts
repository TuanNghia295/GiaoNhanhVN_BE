import { users } from '@/database/schemas/user.schema';
import { vouchers } from '@/database/schemas/voucher.schema';
import { relations } from 'drizzle-orm';
import { integer, pgTable, unique } from 'drizzle-orm/pg-core';

export const voucherUsages = pgTable(
  'voucher_usages',
  {
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    voucherId: integer('voucher_id')
      .references(() => vouchers.id)
      .notNull(),
    usageCount: integer('usage_count').default(1).notNull(),
  },
  (table) => [unique().on(table.userId, table.voucherId)],
);

export const voucherUsagesRelations = relations(voucherUsages, ({ one }) => ({
  voucher: one(vouchers, {
    fields: [voucherUsages.voucherId],
    references: [vouchers.id],
  }),
  user: one(users, {
    fields: [voucherUsages.userId],
    references: [users.id],
  }),
}));

export type VoucherUsage = typeof voucherUsages;
