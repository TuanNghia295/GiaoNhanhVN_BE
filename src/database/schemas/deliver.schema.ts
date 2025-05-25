import { areas } from '@/database/schemas/area.schema';
import { locations } from '@/database/schemas/location.schema';
import { RoleEnum } from '@/database/schemas/user.schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const delivers = pgTable(
  'delivers',
  {
    id: serial('id').primaryKey(),
    role: varchar('role').notNull().default(RoleEnum.DELIVER),
    idCard: varchar('id_card').notNull(),
    phone: varchar('phone').notNull(),
    email: varchar('email'),
    fullName: varchar('full_name').notNull(),
    avatar: varchar('avatar'),
    password: varchar('password').notNull(),
    gender: varchar({ length: 255 }),
    dateOfBirth: date('date_of_birth', { mode: 'date' }),
    cancelOrderCount: integer('cancel_order_count').default(0),

    //sẽ bỏ
    rating: numeric('rating', { precision: 10, scale: 2, mode: 'number' }),
    point: numeric('point', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).default(0),
    status: boolean().default(true),
    activated: boolean().default(false),
    fcmToken: varchar('fcm_token'),
    refreshToken: varchar('refresh_token'),

    areaId: integer('area_id'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      name: 'delivers_areaId_areas_fk',
      columns: [table.areaId],
      foreignColumns: [areas.id],
    })
      .onUpdate('no action')
      .onDelete('cascade'),
  ],
);

export const deliversRelations = relations(delivers, ({ many, one }) => ({
  orders: many(delivers),
  location: one(locations),
  area: one(areas, {
    fields: [delivers.areaId],
    references: [areas.id],
  }),
}));

export type Deliver = typeof delivers.$inferSelect;
