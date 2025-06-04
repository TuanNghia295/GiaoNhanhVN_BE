import { areas } from '@/database/schemas/area.schema';
import { relations } from 'drizzle-orm';
import {
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const deliveryRegions = pgTable('delivery_regions', {
  id: serial().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: numeric('price', {
    precision: 15,
    scale: 2,
    mode: 'number',
  }).notNull(),
  areaId: integer('area_id').notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const deliveryRegionRelations = relations(
  deliveryRegions,
  ({ one }) => ({
    area: one(areas, {
      fields: [deliveryRegions.areaId],
      references: [areas.id],
    }),
  }),
);
