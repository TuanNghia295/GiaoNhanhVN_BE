import { DEFAULT_PAGE_LIMIT } from '@/constants/app.constant';
import * as schema from '@/database/schemas';
import { config } from 'dotenv';
import { count } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgSelect } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

config({ path: `.env.${process.env.NODE_ENV}` });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
export const DRIZZLE = Symbol('drizzle-connection');

export function withPagination<T extends PgSelect>(
  qb: T,
  limit = DEFAULT_PAGE_LIMIT,
  offset = 0,
) {
  return qb.limit(limit).offset(offset);
}

export async function queryWithCount<T extends PgSelect>(
  qb: T,
): Promise<[Awaited<T>, number]> {
  const result = await qb;
  // @ts-expect-error hack to override internals (not the ideal way)
  qb.config.fields = { count: count() };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  qb.config.orderBy = [];
  const [total] = await qb;
  return [result, total.count];
}

export type Transaction = Parameters<
  Parameters<(typeof db)['transaction']>[0]
>[0];
