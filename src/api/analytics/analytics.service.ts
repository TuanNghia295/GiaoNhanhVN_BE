import { AdminRevenueReqDto } from '@/api/analytics/dto/admin-revenue.req.dto';
import {
  AdminRevenueResDto,
  OrderStatusRevenueResDto,
} from '@/api/analytics/dto/admin-revenue.res.dto';
import {
  OrderStatusStoreRevenueResDto,
  StoreRevenueResDto,
} from '@/api/analytics/dto/store-revenue.res.dto';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { StoresService } from '@/api/stores/stores.service';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import {
  orders,
  OrderStatusEnum,
  stores,
  vouchers,
  vouchersOnOrders,
} from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { endOfDay, startOfDay } from 'date-fns';
import { and, between, count, eq, sql, sum } from 'drizzle-orm';

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
  constructor(
    private readonly storeService: StoresService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

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

  async getMyStoreRevenue(reqDto: AdminRevenueReqDto, payload: JwtPayloadType) {
    const store = await this.storeService.existStoreByUserId(payload.id);
    if (!store) {
      throw new ValidationException(ErrorCode.S001, HttpStatus.NOT_FOUND);
    }
    if (reqDto.from && reqDto.to) {
      reqDto.from = startOfDay(reqDto.from);
      reqDto.to = endOfDay(reqDto.to);
    } else {
      reqDto.from = startOfDay(new Date());
      reqDto.to = endOfDay(new Date());
    }

    const statuses: OrderStatusEnum[] = Object.values(OrderStatusEnum);

    let results = await Promise.all(
      statuses.map(async (status) => {
        const result = await this.db
          .select({
            status: orders.status,
            total_order: count(orders.id).mapWith(Number).as('total_order'),
            total_product_price: sum(orders.totalProduct)
              .mapWith(Number)
              .as('total_product_price'),
            total_user_payment: sum(orders.total)
              .mapWith(Number)
              .as('total_user_payment'),
            total_store_service_fee: sum(
              sql`${orders.totalProduct} -
              ${orders.payforShop}`,
            )
              .mapWith(Number)
              .as('total_store_service_fee'),
            total_voucher_value: sum(
              sql`CASE WHEN
                ${vouchers.userId}
                IS
                NOT
                NULL
                THEN
                ${vouchers.value}
                ELSE
                0
                END`,
            )
              .mapWith(Number)
              .as('total_voucher_value'),
            total_store_revenue: sum(
              sql`${orders.payforShop} - 
              CASE 
                WHEN
                ${vouchers.userId}
                IS
                NOT
                NULL
                THEN
                ${vouchers.value}
                ELSE
                0
                END`,
            )
              .mapWith(Number)
              .as('total_store_revenue'),
          })
          .from(orders)
          .leftJoin(stores, eq(orders.storeId, stores.id))
          .leftJoin(vouchersOnOrders, eq(vouchersOnOrders.orderId, orders.id))
          .leftJoin(vouchers, eq(vouchers.id, vouchersOnOrders.voucherId))
          .groupBy(orders.status)
          .where(
            and(
              eq(orders.status, status),
              // eq(stores.id, store.storeId), // $1
              // between(orders.createdAt, reqDto.to, reqDto.to), // $2, $3
            ),
          );

        return result[0]; // because Drizzle returns array of rows
      }),
    );

    const total_all_order = results.reduce(
      (acc, cur) => acc + Number(cur.total_order),
      0,
    );

    const total_all_product_price = results.reduce(
      (acc, cur) => acc + cur.total_product_price,
      0,
    );

    const total_all_store_service_fee = results.reduce(
      (acc, cur) => acc + cur.total_store_service_fee,
      0,
    );

    const total_all_voucher_value = results.reduce(
      (acc, cur) => acc + cur.total_voucher_value,
      0,
    );

    const total_all_store_revenue = results.reduce(
      (acc, cur) => acc + cur.total_store_revenue,
      0,
    );

    results = results.map((r) => {
      const newResult: any = {};
      if (r.status === 'CANCELED') {
        newResult.total_store_service_fee = `-${r.total_store_service_fee}`;
        newResult.total_voucher_value = `+${r.total_voucher_value}`;
      } else if (r.status === 'DELIVERED') {
        newResult.total_store_service_fee = `+${r.total_store_service_fee}`;
        newResult.total_voucher_value = `-${r.total_voucher_value}`;
      }
      return {
        ...r,
        ...newResult,
      };
    });

    results = results.sort((a, b) => {
      const statusOrder = [
        OrderStatusEnum.DELIVERED,
        OrderStatusEnum.CANCELED,
        OrderStatusEnum.PENDING,
        OrderStatusEnum.ACCEPTED,
        OrderStatusEnum.DELIVERING,
      ];
      return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    });

    const data = plainToInstance(StoreRevenueResDto, {
      all: results.map((r) =>
        plainToInstance(OrderStatusStoreRevenueResDto, r),
      ),
      total_all_order,
      total_all_product_price,
      total_all_store_service_fee,
      total_all_voucher_value,
      total_all_store_revenue,
    });
    return data;
  }
}
