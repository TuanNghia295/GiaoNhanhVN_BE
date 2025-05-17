import { areas } from '@/database/schemas/area.schema';
import { serviceFees } from '@/database/schemas/service-fee.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';

export const settings = pgTable('settings', {
  id: serial().primaryKey().notNull(),
  openFullTime: boolean('open_full_time').notNull().default(false),
  openTime: timestamp('open_time'),
  closeTime: timestamp('close_time'),
  isRain: boolean('is_rain').notNull().default(false),
  isNight: boolean('is_night').notNull().default(false),
  isHoliday: boolean('is_holiday').notNull().default(false),
  holidayPct: integer('holiday_percent').notNull().default(0),
  rainMorningPct: integer('rain_moring').notNull().default(0),
  rainNightPct: integer('rain_night').notNull().default(0),
  nightFeePct: integer('night_fee').notNull().default(0),
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
  serviceFee: many(serviceFees),
}));

export type Setting = typeof settings.$inferSelect;
