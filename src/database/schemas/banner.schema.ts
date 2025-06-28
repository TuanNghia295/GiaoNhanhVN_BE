import { areas } from '@/database/schemas/area.schema';
import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export enum BannerEnum {
  HOME = 'HOME',
  FOOD = 'FOOD',
  ANOTHER_SHOP = 'ANOTHER_SHOP',
  TRANSPORTATION = 'TRANSPORTATION',
}

export const banners = pgTable('banners', {
  id: serial().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  image: varchar('image', { length: 255 }).notNull(),
  areaId: integer('area_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const bannersRelations = relations(banners, ({ one }) => ({
  area: one(areas, {
    fields: [banners.areaId],
    references: [areas.id],
  }),
}));
