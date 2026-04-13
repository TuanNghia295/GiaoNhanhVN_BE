import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const sessions = pgTable('sessions', {
  id: serial().primaryKey().notNull(),
  hash: varchar({ length: 255 }).notNull(),
  authorId: integer().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/*******************************************************************
 * Relations Sessions with Users - Many to One
 *******************************************************************/
export const sessionsRelations = relations(sessions, ({ one }) => ({
  author: one(users, {
    fields: [sessions.authorId],
    references: [users.id],
  }),
}));
