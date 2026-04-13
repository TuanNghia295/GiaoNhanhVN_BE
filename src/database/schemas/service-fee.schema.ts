import { distances, TDistance } from '@/database/schemas/distance.schema';
import { settings } from '@/database/schemas/setting.schema';
import { relations } from 'drizzle-orm';
import {
  decimal,
  integer,
  numeric,
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
  })
    .notNull()
    .default(0),
  pricePct: numeric('price_percent', { precision: 5, scale: 2, mode: 'number' })
    .notNull()
    .default(0),
  userServiceFee: decimal('user_service_fee', {
    precision: 15,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  userServiceFeePct: integer('user_service_fee_pct').notNull().default(0),
  deliverFee: decimal('deliver_fee', {
    precision: 15,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  deliverFeePct: numeric('deliver_percent', {
    precision: 5,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
  distancePct: numeric('distance_percent', {
    precision: 5,
    scale: 2,
    mode: 'number',
  })
    .notNull()
    .default(0),
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

export type TServiceFee = typeof serviceFees.$inferSelect & {
  distance: TDistance[];
};
