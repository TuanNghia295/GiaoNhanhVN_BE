import { config } from 'dotenv';
import 'dotenv/config';
import { lt } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DateTime } from 'luxon';
import { Pool } from 'pg';

import * as schema from './schemas';

config({ path: `.env.${process.env.NODE_ENV}` });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

const buildCutoff = (): Date =>
  DateTime.now()
    .setZone('Asia/Ho_Chi_Minh')
    .set({ month: 10, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();

async function main() {
  const cutoffDate = buildCutoff();

  console.log(
    'Bắt đầu xóa coin_logs trước',
    DateTime.fromJSDate(cutoffDate).setZone('Asia/Ho_Chi_Minh').toISO(),
  );

  const deletedCoinLogs = await db
    .delete(schema.coinLogs)
    .where(lt(schema.coinLogs.createdAt, cutoffDate))
    .returning({ id: schema.coinLogs.id });

  console.log(`Đã xóa ${deletedCoinLogs.length} bản ghi coin_logs`);
}

main()
  .then(async () => {
    console.log('Xóa coin_logs cũ thành công');
    await pool.end();
  })
  .catch(async (error) => {
    console.error('Lỗi khi xóa coin_logs cũ:', error);
    await pool.end();
    process.exit(1);
  });
