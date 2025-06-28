import { areas } from '@/database/schemas/area.schema';
import { serviceFees } from '@/database/schemas/service-fee.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const settings = pgTable('settings', {
  id: serial().primaryKey().notNull(),
  openFullTime: boolean('open_full_time').notNull().default(false),
  startNightTime: timestamp('start_night_time').notNull().default(new Date()),
  endNightTime: timestamp('end_night_time').notNull().default(new Date()),
  hotline: varchar('hotline', { length: 20 }).default(''),
  fanpage: text('fanpage').default(''),
  isRain: boolean('is_rain').notNull().default(false),
  isNight: boolean('is_night').notNull().default(false),
  nightFee: numeric('night_fee', { precision: 10, scale: 2, mode: 'number' }).notNull().default(0),
  rainFee: numeric('rain_fee', { precision: 10, scale: 2, mode: 'number' }).notNull().default(0),
  areaId: integer('area_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const settingsRelations = relations(settings, ({ one, many }) => ({
  area: one(areas, {
    fields: [settings.areaId],
    references: [areas.id],
  }),
  serviceFees: many(serviceFees),
}));

export type Setting = typeof settings.$inferSelect;
