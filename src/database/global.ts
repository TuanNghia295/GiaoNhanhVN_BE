import { DEFAULT_PAGE_LIMIT } from '@/constants/app.constant';
import * as schema from '@/database/schemas';
import { config } from 'dotenv';
import { AnyColumn, sql } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgSelect } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

config({ path: `.env.${process.env.NODE_ENV}` });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
export const DRIZZLE = Symbol('drizzle-connection');

export function withPagination<T extends PgSelect>(qb: T, limit = DEFAULT_PAGE_LIMIT, offset = 0) {
  return qb.limit(limit).offset(offset);
}

export type Transaction = Parameters<Parameters<(typeof db)['transaction']>[0]>[0];

export const increment = (column: AnyColumn, value = 1) => {
  return sql`${column} +
  ${value}`;
};

export const decrement = (column: AnyColumn, value = 1) => {
  return sql`${column} -
  ${value}`;
};

export function storeIsOpenSql() {
  return sql.raw(`
    (
      (
        (stores."open_time" + INTERVAL '7 hour')::time < (stores."close_time" + INTERVAL '7 hour')::time AND 
        (CURRENT_TIME + INTERVAL '7 hour')::time BETWEEN (stores."open_time" + INTERVAL '7 hour')::time AND (stores."close_time" + INTERVAL '7 hour')::time
      ) OR (
        (stores."open_time" + INTERVAL '7 hour')::time > (stores."close_time" + INTERVAL '7 hour')::time AND (
          (CURRENT_TIME + INTERVAL '7 hour')::time >= (stores."open_time" + INTERVAL '7 hour')::time OR 
          (CURRENT_TIME + INTERVAL '7 hour')::time <= (stores."close_time" + INTERVAL '7 hour')::time
        )
      ) OR (
        (stores."open_second_time" + INTERVAL '7 hour')::time < (stores."close_second_time" + INTERVAL '7 hour')::time AND 
        (CURRENT_TIME + INTERVAL '7 hour')::time BETWEEN (stores."open_second_time" + INTERVAL '7 hour')::time AND (stores."close_second_time" + INTERVAL '7 hour')::time
      ) OR (
        (stores."open_second_time" + INTERVAL '7 hour')::time > (stores."close_second_time" + INTERVAL '7 hour')::time AND (
          (CURRENT_TIME + INTERVAL '7 hour')::time >= (stores."open_second_time" + INTERVAL '7 hour')::time OR 
          (CURRENT_TIME + INTERVAL '7 hour')::time <= (stores."close_second_time" + INTERVAL '7 hour')::time
        )
      )
    )
  `);
}
