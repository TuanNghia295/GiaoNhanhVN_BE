import { config } from 'dotenv';
import 'dotenv/config';
import { inArray, lt } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DateTime } from 'luxon';
import { Pool } from 'pg';
import * as schema from './schemas';

config({ path: `.env.${process.env.NODE_ENV}` });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

type Summary = Record<string, number>;

// build cutoff date is 10/01/2025 00:00:00 in Vietnam time
const buildCutoff = (): Date =>
  DateTime.now()
    .setZone('Asia/Ho_Chi_Minh')
    .set({ month: 10, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();

async function main() {
  const cutoffDate = buildCutoff();
  const summary: Summary = {};

  console.log(
    'Bắt đầu xóa dữ liệu đơn hàng trước',
    DateTime.fromJSDate(cutoffDate).setZone('Asia/Ho_Chi_Minh').toISO(),
  );

  await db.transaction(async (tx) => {
    //--------------------------------------------------
    // Lấy danh sách các đơn hàng cũ trước cutoff date
    //--------------------------------------------------
    const orderIdsResult = await tx
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(lt(schema.orders.createdAt, cutoffDate));

    const orderIds = orderIdsResult.map((order) => order.id);

    console.log(`Tìm thấy ${orderIds.length} đơn hàng cần xóa`);

    if (orderIds.length === 0) {
      console.log('Không có đơn hàng cần xóa');
      return;
    }

    //--------------------------------------------------
    // Lấy danh sách các chi tiết đơn hàng cũ trước cutoff date
    //--------------------------------------------------
    const orderDetailIdsResult = await tx
      .select({ id: schema.orderDetails.id })
      .from(schema.orderDetails)
      .where(inArray(schema.orderDetails.orderId, orderIds));

    const orderDetailIds = orderDetailIdsResult.map((detail) => detail.id);

    console.log(`Tìm thấy ${orderDetailIds.length} bản ghi order_details liên quan`);

    //--------------------------------------------------
    // Xóa các chi tiết đơn hàng cũ trước cutoff date
    //--------------------------------------------------
    if (orderDetailIds.length > 0) {
      console.log('Xóa extras_to_order_details...');
      const extrasDeleted = await tx
        .delete(schema.extrasToOrderDetails)
        .where(inArray(schema.extrasToOrderDetails.orderDetailId, orderDetailIds))
        .returning({ orderDetailId: schema.extrasToOrderDetails.orderDetailId });

      summary.extrasToOrderDetails = extrasDeleted.length;
      console.log(`Đã xóa ${summary.extrasToOrderDetails} bản ghi extras_to_order_details`);

      //--------------------------------------------------
      // Xóa các chi tiết đơn hàng cũ trước cutoff date
      //--------------------------------------------------
      console.log('Xóa order_details...');
      const orderDetailsDeleted = await tx
        .delete(schema.orderDetails)
        .where(inArray(schema.orderDetails.id, orderDetailIds))
        .returning({ id: schema.orderDetails.id });

      summary.orderDetails = orderDetailsDeleted.length;
      console.log(`Đã xóa ${summary.orderDetails} bản ghi order_details`);
    }

    //--------------------------------------------------
    // Xóa các voucher cũ trước cutoff date
    //--------------------------------------------------
    console.log('Xóa vouchers_on_orders...');
    const vouchersDeleted = await tx
      .delete(schema.vouchersOnOrders)
      .where(inArray(schema.vouchersOnOrders.orderId, orderIds))
      .returning({ orderId: schema.vouchersOnOrders.orderId });
    summary.vouchersOnOrders = vouchersDeleted.length;
    console.log(`Đã xóa ${summary.vouchersOnOrders} bản ghi vouchers_on_orders`);

    //--------------------------------------------------
    // Xóa các lý do hủy đơn hàng cũ trước cutoff date
    //--------------------------------------------------
    console.log('Xóa reason_deliver_cancel_orders...');
    const reasonDeliverDeleted = await tx
      .delete(schema.reasonDeliverCancelOrders)
      .where(inArray(schema.reasonDeliverCancelOrders.orderId, orderIds))
      .returning({ id: schema.reasonDeliverCancelOrders.id });
    summary.reasonDeliverCancelOrders = reasonDeliverDeleted.length;
    console.log(`Đã xóa ${summary.reasonDeliverCancelOrders} bản ghi reason_deliver_cancel_orders`);

    //--------------------------------------------------
    // Lấy danh sách các đánh giá cũ trước cutoff date
    //--------------------------------------------------
    const ratingIdsResult = await tx
      .select({ id: schema.ratings.id })
      .from(schema.ratings)
      .where(inArray(schema.ratings.orderId, orderIds));

    const ratingIds = ratingIdsResult.map((rating) => rating.id);
    console.log(`Tìm thấy ${ratingIds.length} bản ghi ratings liên quan`);
    //--------------------------------------------------
    // Xóa các bình luận cũ trước cutoff date
    //--------------------------------------------------
    if (ratingIds.length > 0) {
      console.log('Xóa comments_to_ratings...');
      const commentsToRatingsDeleted = await tx
        .delete(schema.commentsToRatings)
        .where(inArray(schema.commentsToRatings.ratingId, ratingIds))
        .returning({ ratingId: schema.commentsToRatings.ratingId });
      summary.commentsToRatings = commentsToRatingsDeleted.length;
      console.log(`Đã xóa ${summary.commentsToRatings} bản ghi comments_to_ratings`);

      //--------------------------------------------------
      // Xóa các đánh giá cũ trước cutoff date
      //--------------------------------------------------
      console.log('Xóa ratings...');
      const ratingsDeleted = await tx
        .delete(schema.ratings)
        .where(inArray(schema.ratings.id, ratingIds))
        .returning({ id: schema.ratings.id });
      summary.ratings = ratingsDeleted.length;
      console.log(`Đã xóa ${summary.ratings} bản ghi ratings`);
    }

    //--------------------------------------------------
    // Xóa các đơn hàng cũ trước cutoff date
    //--------------------------------------------------
    console.log('Xóa orders...');
    const ordersDeleted = await tx
      .delete(schema.orders)
      .where(inArray(schema.orders.id, orderIds))
      .returning({ id: schema.orders.id });
    summary.orders = ordersDeleted.length;
    console.log(`Đã xóa ${summary.orders} bản ghi orders`);

    //--------------------------------------------------
    // Xóa lịch sử coin logs trước cutoff date
    //--------------------------------------------------
    console.log('Xóa coin_logs...');
    const coinLogsDeleted = await tx
      .delete(schema.coinLogs)
      .where(lt(schema.coinLogs.createdAt, cutoffDate))
      .returning({ id: schema.coinLogs.id });
    summary.coinLogs = coinLogsDeleted.length;
    console.log(`Đã xóa ${summary.coinLogs} bản ghi coin_logs`);
  });

  console.table(summary);
}

main()
  .then(async () => {
    console.log('Xóa đơn hàng cũ thành công');
    await pool.end();
  })
  .catch(async (error) => {
    console.error('Lỗi khi xóa đơn hàng cũ:', error);
    await pool.end();
    process.exit(1);
  });
