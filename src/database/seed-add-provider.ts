import { config } from 'dotenv';
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';
import { DiscountTypeEnum, orders, vouchers, vouchersOnOrders, VouchersTypeEnum } from './schemas';

config({ path: `.env.${process.env.NODE_ENV}` });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

async function main() {
  // Lấy tất cả các đơn hàng cần cập nhật
  const allOrders = await db.select().from(orders);

  // Chia thành các batch để xử lý (tránh quá tải)
  const batchSize = 100;
  for (let i = 0; i < allOrders.length; i += batchSize) {
    const batch = allOrders.slice(i, i + batchSize);

    // Xử lý từng batch song song
    await Promise.all(
      batch.map(async (order) => {
        // Lấy tất cả voucher của đơn hàng
        const orderVouchers = await db
          .select({
            id: vouchers.id,
            type: vouchers.type,
            discount_type: vouchers.discountType,
            value: vouchers.value,
            max_discount: vouchers.maxDiscount,
          })
          .from(vouchersOnOrders)
          .leftJoin(vouchers, eq(vouchersOnOrders.voucherId, vouchers.id))
          .where(eq(vouchersOnOrders.orderId, order.id));

        // Tính toán tổng voucher App và Store
        let totalVoucherApp = 0;
        let totalVoucherStore = 0;

        orderVouchers.forEach((voucher) => {
          let voucherValue = 0;

          if (voucher.discount_type === DiscountTypeEnum.FIXED_AMOUNT) {
            voucherValue = voucher.value;
          } else if (voucher.discount_type === DiscountTypeEnum.PERCENTAGE) {
            voucherValue = (order.totalProduct * voucher.value) / 100;
            if (voucher.max_discount && voucherValue > voucher.max_discount) {
              voucherValue = voucher.max_discount;
            }
          }

          if (
            voucher.type === VouchersTypeEnum.ADMIN ||
            voucher.type === VouchersTypeEnum.MANAGEMENT
          ) {
            totalVoucherApp += voucherValue;
          } else if (voucher.type === VouchersTypeEnum.STORE) {
            totalVoucherStore += voucherValue;
          }
        });

        // Cập nhật lại đơn hàng
        await db
          .update(orders)
          .set({
            totalVoucherApp,
            totalVoucherStore,
          })
          .where(eq(orders.id, order.id));
      }),
    );

    // Thêm delay nhỏ giữa các batch nếu cần
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`Đã cập nhật ${allOrders.length} đơn hàng`);
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
