import { areas } from '@/database/schemas/area.schema';
import { delivers } from '@/database/schemas/deliver.schema';
import { users } from '@/database/schemas/user.schema';
import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const locations = pgTable('locations', {
  id: serial('id').primaryKey().notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  geometry: varchar('geometry', { length: 255 }).notNull(),
  userId: integer('user_id'),
  areaId: integer('area_id'),
  deliverId: integer('deliver_id').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const locationRelations = relations(locations, ({ one }) => ({
  Area: one(areas, {
    fields: [locations.areaId],
    references: [areas.id],
  }),
  deliver: one(delivers, {
    fields: [locations.deliverId],
    references: [delivers.id],
  }),
  user: one(users, {
    fields: [locations.userId],
    references: [users.id],
  }),
}));
