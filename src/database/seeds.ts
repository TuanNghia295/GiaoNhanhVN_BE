import { config } from 'dotenv';
import 'dotenv/config';
import { desc, sql } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

config({ path: `.env.${process.env.NODE_ENV}` });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

async function main() {
  // const listUser = await db.select().from(users).orderBy(desc(users.id));
  // const listManager = await db
  //   .select()
  //   .from(managers)
  //   .orderBy(desc(managers.id));
  // await db.execute(
  //   sql.raw(
  //     `ALTER SEQUENCE users_id_seq RESTART WITH ${Math.max(...listUser.map((u) => u.id)) + 1}`,
  //   ),
  // );
  // await db.execute(
  //   sql.raw(
  //     `ALTER SEQUENCE managers_id_seq RESTART WITH ${Math.max(...listManager.map((m) => m.id)) + 1}`,
  //   ),
  // );

  const listArea = await db
    .select()
    .from(schema.areas)
    .orderBy(desc(schema.areas.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE areas_id_seq RESTART WITH ${Math.max(...listArea.map((a) => a.id)) + 1}`,
    ),
  );
  // await seed(db, { managers: schema.managers }).refine((f) => ({
  //   managers: {
  //     count: 1,
  //     columns: {
  //       phone: f.default({
  //         defaultValue: '00000000000',
  //       }),
  //       username: f.default({
  //         defaultValue: 'admin',
  //       }),
  //       password: f.default({
  //         defaultValue: '123456',
  //       }),
  //     },
  //   },
  // }));
}

main()
  .then(() => {
    console.log('insert database successfully');
  })
  .catch((err) => {
    console.error(err);
  });
