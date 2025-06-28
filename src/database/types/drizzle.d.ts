import * as schemas from '@/database/schemas';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type FindManyQueryConfig<T extends RelationalQueryBuilder<any, any>> = Parameters<
  T['findMany']
>[0];

export type DrizzleDB = NodePgDatabase<typeof schemas>;
