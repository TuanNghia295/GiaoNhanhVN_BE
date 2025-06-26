import { config } from 'dotenv';
import 'dotenv/config';
import { isNotNull, isNull } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';
import { ProviderEnum, users } from './schemas';

config({ path: `.env.${process.env.NODE_ENV}` });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

async function main() {
  // check nếu pasword null thì mặt định là zalo

  console.log('Starting seeding process...');
  await db
    .update(users)
    .set({ provider: ProviderEnum.ZALO })
    .where(isNull(users.password))
    .execute()
    .then(() => {
      console.log('Updated users with null password to ZALO provider');
    })
    .catch((error) => {
      console.error('Error updating users with null password:', error);
    });

  await db
    .update(users)
    .set({ provider: ProviderEnum.PASSWORD })
    .where(isNotNull(users.password))
    .execute()
    .then(() => {
      console.log('Updated users with null email to EMAIL provider');
    })
    .catch((error) => {
      console.error('Error updating users with null email:', error);
    });
}

main()
  .then(async () => {
    console.log('Seeding completed successfully');
    await pool.end();
  })
  .catch(async (error) => {
    console.error('Error during seeding:', error);
    await pool.end();
  });
