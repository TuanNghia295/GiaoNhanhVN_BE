import { distances } from '@/database/schemas/distance.schema';
import { settings } from '@/database/schemas/setting.schema';
import { relations } from 'drizzle-orm';
import {
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const serviceFees = pgTable('service_fees', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull(),
  price: decimal('price', {
    precision: 15,
    scale: 2,
    mode: 'number',
  }).notNull(),
  pricePct: integer('price_percent').notNull(),
  userServiceFee: decimal('user_service_fee', {
    precision: 15,
    scale: 2,
    mode: 'number',
  }).notNull(),
  userServiceFeePct: integer('user_service_fee_pct').notNull(),
  deliverFee: decimal('deliver_fee', {
    precision: 15,
    scale: 2,
    mode: 'number',
  }).notNull(),
  deliverFeePct: integer('deliver_percent').notNull(),
  distancePct: decimal('distance_percent', {
    precision: 5,
    scale: 2,
    mode: 'number',
  }).notNull(),
  settingId: integer().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const serviceFeesRelations = relations(serviceFees, ({ one, many }) => ({
  setting: one(settings, {
    fields: [serviceFees.settingId],
    references: [settings.id],
  }),
  distance: many(distances),
}));
