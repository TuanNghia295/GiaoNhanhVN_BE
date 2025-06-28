import { config } from 'dotenv';
import 'dotenv/config';
import { desc, sql } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';
import { managers, users } from './schemas';

config({ path: `.env.${process.env.NODE_ENV}` });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

async function main() {
  const listUser = await db.select().from(users).orderBy(desc(users.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE users_id_seq RESTART WITH ${Math.max(...listUser.map((u) => u.id)) + 1}`,
    ),
  );
  const listManager = await db.select().from(schema.managers).orderBy(desc(managers.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE managers_id_seq RESTART WITH ${Math.max(...listManager.map((m) => m.id)) + 1}`,
    ),
  );

  const listArea = await db.select().from(schema.areas).orderBy(desc(schema.areas.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE areas_id_seq RESTART WITH ${Math.max(...listArea.map((a) => a.id)) + 1}`,
    ),
  );
  const storeMenusList = await db
    .select()
    .from(schema.storeMenus)
    .orderBy(desc(schema.storeMenus.id));

  await db.execute(
    sql.raw(
      `ALTER SEQUENCE store_menus_id_seq RESTART WITH ${Math.max(...storeMenusList.map((a) => a.id)) + 1}`,
    ),
  );
  const productsList = await db.select().from(schema.products).orderBy(desc(schema.products.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE products_id_seq RESTART WITH ${Math.max(...productsList.map((a) => a.id)) + 1}`,
    ),
  );
  const notificationsList = await db
    .select()
    .from(schema.notifications)
    .orderBy(desc(schema.notifications.id));

  await db.execute(
    sql.raw(
      `ALTER SEQUENCE notifications_id_seq RESTART WITH ${Math.max(...notificationsList.map((a) => a.id)) + 1}`,
    ),
  );
  const listStore = await db.select().from(schema.stores).orderBy(desc(schema.stores.id));

  await db.execute(
    sql.raw(
      `ALTER SEQUENCE stores_id_seq RESTART WITH ${Math.max(...listStore.map((a) => a.id)) + 1}`,
    ),
  );
  const listOption = await db.select().from(schema.options).orderBy(desc(schema.options.id));

  await db.execute(
    sql.raw(
      `ALTER SEQUENCE options_id_seq RESTART WITH ${Math.max(...listOption.map((a) => a.id)) + 1}`,
    ),
  );

  // coi lại
  const [result] = await db
    .select({
      maxId: sql<number>`MAX
        (${schema.extras.id})`,
    })
    .from(schema.extras);

  const nextId = (result.maxId ?? 0) + 1;

  await db.execute(sql.raw(`ALTER SEQUENCE extras_id_seq RESTART WITH ${nextId}`));

  const orderDetailsList = await db
    .select()
    .from(schema.orderDetails)
    .orderBy(desc(schema.orderDetails.id));

  await db.execute(
    sql.raw(
      `ALTER SEQUENCE order_details_id_seq RESTART WITH ${Math.max(...orderDetailsList.map((a) => a.id)) + 1}`,
    ),
  );
  const ordersList = await db.select().from(schema.orders).orderBy(desc(schema.orders.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE orders_id_seq RESTART WITH ${Math.max(...ordersList.map((a) => a.id)) + 1}`,
    ),
  );
  const vouchersList = await db.select().from(schema.vouchers).orderBy(desc(schema.vouchers.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE vouchers_id_seq RESTART WITH ${Math.max(...vouchersList.map((a) => a.id)) + 1}`,
    ),
  );

  const transactionsList = await db
    .select()
    .from(schema.transactions)
    .orderBy(desc(schema.transactions.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE transactions_id_seq RESTART WITH ${Math.max(...transactionsList.map((a) => a.id)) + 1}`,
    ),
  );
  const deliverList = await db.select().from(schema.delivers).orderBy(desc(schema.delivers.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE delivers_id_seq RESTART WITH ${Math.max(...deliverList.map((a) => a.id)) + 1}`,
    ),
  );
  const storeRequest = await db
    .select()
    .from(schema.storeRequests)
    .orderBy(desc(schema.storeRequests));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE store_requests_id_seq RESTART WITH ${Math.max(...storeRequest.map((a) => a.id)) + 1}`,
    ),
  );
  const ratingList = await db.select().from(schema.ratings).orderBy(desc(schema.ratings.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE ratings_id_seq RESTART WITH ${Math.max(...ratingList.map((a) => a.id)) + 1}`,
    ),
  );
  const resionCancelList = await db
    .select()
    .from(schema.reasonDeliverCancelOrders)
    .orderBy(desc(schema.reasonDeliverCancelOrders.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE reason_deliver_cancel_orders_id_seq RESTART WITH ${Math.max(...resionCancelList.map((a) => a.id)) + 1}`,
    ),
  );
  const listSettings = await db.select().from(schema.settings).orderBy(desc(schema.settings.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE settings_id_seq RESTART WITH ${Math.max(...listSettings.map((a) => a.id)) + 1}`,
    ),
  );
  const serviceFeeList = await db
    .select()
    .from(schema.serviceFees)
    .orderBy(desc(schema.serviceFees.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE service_fees_id_seq RESTART WITH ${Math.max(...serviceFeeList.map((a) => a.id)) + 1}`,
    ),
  );
  const distanceList = await db.select().from(schema.distances).orderBy(desc(schema.distances.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE distances_id_seq RESTART WITH ${Math.max(...distanceList.map((a) => a.id)) + 1}`,
    ),
  );

  const bankRecordsList = await db
    .select()
    .from(schema.bankRecords)
    .orderBy(desc(schema.bankRecords.id));
  await db.execute(
    sql.raw(
      `ALTER SEQUENCE bank_records_id_seq RESTART WITH ${Math.max(...bankRecordsList.map((a) => a.id)) + 1}`,
    ),
  );

  const locationList = await db.select().from(schema.locations).orderBy(desc(schema.locations.id));

  await db.execute(
    sql.raw(
      `ALTER SEQUENCE locations_id_seq RESTART WITH ${Math.max(...locationList.map((a) => a.id)) + 1}`,
    ),
  );

  const deliveryRegionsList = await db
    .select()
    .from(schema.deliveryRegions)
    .orderBy(desc(schema.deliveryRegions.id));

  await db.execute(
    sql.raw(
      `ALTER SEQUENCE delivery_regions_id_seq RESTART WITH ${Math.max(...deliveryRegionsList.map((a) => a.id)) + 1}`,
    ),
  );
}

main()
  .then(() => {
    console.log('insert database successfully');
  })
  .catch((err) => {
    console.error(err);
  });
