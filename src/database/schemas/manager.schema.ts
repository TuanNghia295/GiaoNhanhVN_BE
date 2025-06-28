import { areas } from '@/database/schemas/area.schema';
import { RoleEnum } from '@/database/schemas/user.schema';
import { relations } from 'drizzle-orm';
import { foreignKey, integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const managers = pgTable(
  'managers',
  {
    id: serial().primaryKey().notNull(),
    username: varchar({ length: 255 }).notNull().unique(),
    password: varchar({ length: 255 }).notNull(),
    phone: varchar({ length: 255 }).notNull().unique(),
    refreshToken: varchar('refresh_token', { length: 255 }),
    role: varchar('role').notNull().default(RoleEnum.MANAGEMENT),
    areaId: integer('area_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      name: 'managers_areaId_areas_fk',
      columns: [table.areaId],
      foreignColumns: [areas.id],
    })
      .onUpdate('no action')
      .onDelete('cascade'),
  ],
);

export const managersRelations = relations(managers, ({ one }) => ({
  area: one(areas, {
    fields: [managers.areaId],
    references: [areas.id],
    relationName: 'area',
  }),
}));
