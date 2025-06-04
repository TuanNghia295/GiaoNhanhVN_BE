import { serviceFees } from '@/database/schemas/service-fee.schema';
import { relations } from 'drizzle-orm';
import {
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';

export const distances = pgTable('distances', {
  id: serial('id').primaryKey(),
  minDistance: integer('min_distance').notNull(),
  maxDistance: integer('max_distance').notNull(),
  rate: decimal('rate', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  serviceFeeId: integer('service_fee_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const distancesRelations = relations(distances, ({ one }) => ({
  serviceFee: one(serviceFees, {
    fields: [distances.serviceFeeId],
    references: [serviceFees.id],
  }),
}));

export type TDistance = typeof distances.$inferSelect;
