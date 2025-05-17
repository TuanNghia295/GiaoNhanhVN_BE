import { AdminRevenueReqDto } from '@/api/analytics/dto/admin-revenue.req.dto';
import {
  AdminRevenueResDto,
  OrderStatusRevenueResDto,
} from '@/api/analytics/dto/admin-revenue.res.dto';
import { DRIZZLE } from '@/database/global';
import {
  orders,
  OrderStatusEnum,
  vouchers,
  vouchersOnOrders,
} from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { endOfDay, startOfDay } from 'date-fns';
import { and, between, eq, sql } from 'drizzle-orm';

export type RevenueResult = {
  status: OrderStatusEnum | null; // null cho dòng tổng
  total_order: number;
  total_product_price: number;
  total_user_payment: number;
  total_store_service_fee: number;
  total_deliver_service_fee: number;
  total_voucher_value: number;
  total_app_revenue: number;
};

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getAdminRevenue(reqDto: AdminRevenueReqDto) {
    const fieldsToSum = [
      'total_order',
      'total_product_price',
      'total_user_payment',
      'total_store_service_fee',
      'total_deliver_service_fee',
      'total_voucher_value',
      'total_app_revenue',
    ] as const;

    let results = await this.db
      .select({
        status: orders.status,
        total_order: sql<number>`COUNT
          (${orders.id})`,
        total_product_price: sql<number>`SUM
          (${orders.totalProduct})`,
        total_user_payment: sql<number>`SUM
          (${orders.total})`,
        total_store_service_fee: sql<number>`SUM
          (${orders.totalProduct} - ${orders.payforShop})`,
        total_deliver_service_fee: sql<number>`SUM
          (${orders.totalDelivery} - ${orders.incomeDeliver})`,
        total_voucher_value: sql<number>`SUM
        ( CASE
          WHEN ${vouchers.managerId} IS NOT NULL THEN ${vouchers.value}
          ELSE 0
          END)`,
        total_app_revenue: sql<number>`SUM
        (
          (${orders.totalProduct} - ${orders.payforShop}) + (${orders.totalDelivery} - ${orders.incomeDeliver}) -
            (
            CASE
            WHEN ${vouchers.managerId} IS NOT NULL THEN ${vouchers.value}
            ELSE 0
            END))`,
      })
      .from(orders)
      .leftJoin(vouchersOnOrders, eq(orders.id, vouchersOnOrders.orderId))
      .leftJoin(vouchers, eq(vouchersOnOrders.voucherId, vouchers.id))
      .where(
        and(
          ...(reqDto.areaId ? [eq(orders.areaId, reqDto.areaId)] : []),
          ...(reqDto.from && reqDto.to
            ? [
                between(
                  orders.createdAt,
                  startOfDay(reqDto.from),
                  endOfDay(reqDto.to),
                ),
              ]
            : []),
        ),
      )
      .groupBy(orders.status);

    results = results.map((r) => {
      const newResult: any = {};
      if (r.status === 'CANCELED') {
        newResult.status = OrderStatusEnum.CANCELED;
        newResult.total_store_service_fee = `-${r.total_store_service_fee}`;
        newResult.total_deliver_service_fee = `-${r.total_deliver_service_fee}`;
        newResult.total_voucher_value = `+${r.total_voucher_value}`;
        newResult.total_app_revenue = `-${r.total_app_revenue}`;
      } else if (r.status === 'DELIVERED') {
        newResult.status = OrderStatusEnum.DELIVERED;
        newResult.total_store_service_fee = `+${r.total_store_service_fee}`;
        newResult.total_deliver_service_fee = `+${r.total_deliver_service_fee}`;
        newResult.total_voucher_value = `-${r.total_voucher_value}`;
        newResult.total_app_revenue = `+${r.total_app_revenue}`;
      } else {
        newResult.total_store_service_fee = r.total_store_service_fee;
        newResult.total_deliver_service_fee = r.total_deliver_service_fee;
        newResult.total_voucher_value = r.total_voucher_value;
        newResult.total_app_revenue = r.total_app_revenue;
      }
      return {
        ...r,
        ...newResult,
      };
    });

    // Tính tổng
    const totals = results.reduce(
      (acc, cur) => {
        acc.total_all_order += Number(cur.total_order);
        acc.total_all_product_price += Number(cur.total_product_price);
        acc.total_all_user_payment += Number(cur.total_user_payment);
        acc.total_all_store_service_fee += Number(cur.total_store_service_fee);
        acc.total_all_deliver_service_fee += Number(
          cur.total_deliver_service_fee,
        );
        acc.total_all_voucher_value += Number(cur.total_voucher_value);
        acc.total_all_app_revenue += Number(cur.total_app_revenue);
        return acc;
      },
      {
        total_all_order: 0,
        total_all_product_price: 0,
        total_all_user_payment: 0,
        total_all_store_service_fee: 0,
        total_all_deliver_service_fee: 0,
        total_all_voucher_value: 0,
        total_all_app_revenue: 0,
      },
    );

    const ORDER_STATUSES = Object.values(OrderStatusEnum);

    const allWithDefaults = ORDER_STATUSES.map((status) => {
      const found = results.find((r) => r.status === status);
      const entry: Record<string, any> = { status };
      fieldsToSum.forEach((field) => {
        entry[field] = found?.[field] ?? 0;
      });
      return plainToInstance(OrderStatusRevenueResDto, entry);
    });

    return plainToInstance(AdminRevenueResDto, {
      all: allWithDefaults.map((r) =>
        plainToInstance(OrderStatusRevenueResDto, r),
      ),
      ...totals,
      total_all_app_revenue: totals.total_all_app_revenue,
    });
  }
}
