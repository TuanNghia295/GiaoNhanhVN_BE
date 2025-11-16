import { config } from 'dotenv';
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

config({ path: `.env.${process.env.NODE_ENV}` });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

async function migrateOptionsToOptionGroups() {
  await db.transaction(async (tx) => {
    // 1. Tạo nhóm option_one cho các sản phẩm chưa có nhóm
    const insertGroupsResult = await tx.execute(sql`
      INSERT INTO option_groups (product_id, name, display_name, is_required, min_select, max_select, order_index)
      SELECT DISTINCT o.product_id, 'option_one', 'Option 1', TRUE, 1, 1, 0
      FROM options o
      LEFT JOIN option_groups og ON og.product_id = o.product_id
      WHERE o.product_id IS NOT NULL
        AND og.id IS NULL
    `);
    console.log(`Inserted option groups: ${insertGroupsResult.rowCount ?? 0}`);

    // 2. Chuyển các option cũ sang bảng option_group_options
    const insertGroupOptionsResult = await tx.execute(sql`
      INSERT INTO option_group_options (option_group_id, name, price, order_index)
      SELECT
        og.id,
        o.name,
        o.price,
        ROW_NUMBER() OVER (PARTITION BY o.product_id ORDER BY o.id) - 1
      FROM options o
      JOIN option_groups og
        ON og.product_id = o.product_id AND og.name = 'option_one'
      WHERE o.product_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM option_group_options existing
          WHERE existing.option_group_id = og.id
        )
    `);
    console.log(`Inserted option group options: ${insertGroupOptionsResult.rowCount ?? 0}`);

    // 3. Cập nhật option_version cho các sản phẩm đã chuyển đổi
    const updateProductsResult = await tx.execute(sql`
      UPDATE products
      SET option_version = 2
      WHERE option_version <> 2
        AND id IN (
          SELECT DISTINCT og.product_id
          FROM option_groups og
          WHERE og.name = 'option_one'
        )
    `);
    console.log(`Updated products option_version: ${updateProductsResult.rowCount ?? 0}`);
  });
}

async function main() {
  try {
    await migrateOptionsToOptionGroups();
    console.log('Migration completed.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

void main();
