import { AdminRevenueReqDto } from '@/api/analytics/dto/admin-revenue.req.dto';
import { StoreRevenueReqDto } from '@/api/analytics/dto/store-revenue.req.dto';
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
    const statuses: OrderStatusEnum[] = Object.values(OrderStatusEnum);
    const results = await this.db
      .select({
        status: orders.status,
        total_order: count(orders.id).mapWith(Number),
        total_product_price: sum(orders.totalProduct).mapWith(Number),
        total_user_payment: sum(orders.total).mapWith(Number),
        total_store_service_fee: sum(orders.storeServiceFee).mapWith(Number),
        total_deliver_service_fee: sql<number>`SUM
          (${orders.totalDelivery} - ${orders.incomeDeliver})`.mapWith(Number),
        total_voucher_value: sum(orders.totalVoucher).mapWith(Number),
        total_app_revenue: sql<number>`SUM
        ( (${orders.totalProduct} - ${orders.payforShop}) + ${orders.userServiceFee} +
          (${orders.totalDelivery} - ${orders.incomeDeliver}) -
          (
          CASE
          WHEN ${vouchers.managerId} IS NOT NULL THEN
          LEAST(${orders.totalDelivery}, ${vouchers.value})
          ELSE 0
          END))`.mapWith(Number),
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

    const result = statuses.map((status) => {
      const filterData = results.find((r) => r.status === status) || {
        total_order: 0,
        total_product_price: 0,
        total_user_payment: 0,
        total_store_service_fee: 0,
        total_deliver_service_fee: 0,
        total_voucher_value: 0,
        total_app_revenue: 0,
      };

      return {
        status,
        total_order: filterData.total_order,
        total_product_price: filterData.total_product_price,
        total_user_payment: filterData.total_user_payment,
        total_store_service_fee: filterData.total_store_service_fee,
        total_deliver_service_fee: filterData.total_deliver_service_fee,
        total_voucher_value: filterData.total_voucher_value,
        total_app_revenue: filterData.total_app_revenue,
      };
    });

    // Sắp xếp theo thứ tự trạng thái
    const statusOrder = [
      OrderStatusEnum.DELIVERED,
      OrderStatusEnum.CANCELED,
      OrderStatusEnum.PENDING,
      OrderStatusEnum.ACCEPTED,
      OrderStatusEnum.DELIVERING,
    ];
    result.sort(
      (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
    );

    const DATA_FILTERED = result.filter(
      (item) => item.status !== OrderStatusEnum.CANCELED,
    );
    const total_all: RevenueResult = {
      status: null, // Dòng tổng không có trạng thái
      total_order: DATA_FILTERED.reduce(
        (acc, cur) => acc + Number(cur.total_order),
        0,
      ),
      total_product_price: DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_product_price,
        0,
      ),
      total_user_payment: DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_user_payment,
        0,
      ),
      total_store_service_fee: DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_store_service_fee,
        0,
      ),
      total_deliver_service_fee: DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_deliver_service_fee,
        0,
      ),
      total_voucher_value: DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_voucher_value,
        0,
      ),
      total_app_revenue: DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_app_revenue,
        0,
      ),
    };

    const data = {
      all: result,
      total_all_order: total_all.total_order.toString(),
      total_all_product_price: total_all.total_product_price.toString(),
      total_all_user_payment: total_all.total_user_payment.toString(),
      total_all_store_service_fee: total_all.total_store_service_fee.toString(),
      total_all_deliver_service_fee:
        total_all.total_deliver_service_fee.toString(),
      total_all_voucher_value: total_all.total_voucher_value.toString(),
      total_all_app_revenue: total_all.total_app_revenue.toString(),
    };
    console.log('data', data);
    return data;
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

  async getStoreRevenue(reqDto: StoreRevenueReqDto, payload: JwtPayloadType) {
    if (!reqDto.from || !reqDto.to) {
      reqDto.from = new Date();
      reqDto.to = new Date();
    }

    const store = await this.storeService.existStoreByUserId(payload.id);
    if (!store) {
      throw new ValidationException(ErrorCode.S001, HttpStatus.NOT_FOUND);
    }

    const statuses: OrderStatusEnum[] = Object.values(OrderStatusEnum);

    const orderFilter = await this.db
      .select({
        status: orders.status,
        total_order: count(orders.id).mapWith(Number).as('total_order'),
        total_product_price: sum(orders.totalProduct)
          .mapWith(Number)
          .as('total_product_price'),
        total_store_service_fee: sum(
          sql`${orders.totalProduct} -
          ${orders.payforShop}`,
        )
          .mapWith(Number)
          .as('total_store_service_fee'),
        total_voucher_value: sql
          .raw(
            `
          SUM(
            CASE 
              WHEN vouchers.user_id IS NOT NULL 
              AND vouchers_on_orders.order_id IS NOT NULL 
              THEN LEAST(vouchers.value, orders.total_product)
              ELSE 0 
            END
          )
        `,
          )
          .mapWith(Number)
          .as('total_voucher_value'),
        total_store_revenue: sum(orders.payforShop)
          .mapWith(Number)
          .as('total_store_revenue'),
      })
      .from(orders)
      .leftJoin(vouchersOnOrders, eq(orders.id, vouchersOnOrders.orderId))
      .leftJoin(vouchers, eq(vouchersOnOrders.voucherId, vouchers.id))
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(
        and(
          eq(stores.id, store.storeId),
          between(
            orders.createdAt,
            startOfDay(reqDto.from),
            endOfDay(reqDto.to),
          ),
        ),
      )
      .groupBy(orders.status);

    const orderFilterMap = new Map(
      orderFilter.map((item) => [item.status, item]),
    );

    const result = statuses.map((status) => {
      const filterData = orderFilterMap.get(status) || {
        total_order: 0,
        total_product_price: 0,
        total_store_service_fee: 0,
        total_voucher_value: 0,
        total_store_revenue: 0,
      };

      return {
        status,
        total_order: filterData.total_order,
        total_product_price: filterData.total_product_price,
        total_store_service_fee: filterData.total_store_service_fee,
        total_voucher_value: filterData.total_voucher_value,
        total_store_revenue: filterData.total_store_revenue,
      };
    });

    // Sắp xếp theo thứ tự trạng thái
    const statusOrder = [
      OrderStatusEnum.DELIVERED,
      OrderStatusEnum.CANCELED,
      OrderStatusEnum.PENDING,
      OrderStatusEnum.ACCEPTED,
      OrderStatusEnum.DELIVERING,
    ];

    result.sort(
      (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
    );

    console.log('result', result);

    // ✅ Tính tổng trừ các đơn hàng đã hủy
    const DATA_FILTERED = result.filter(
      (item) => item.status !== OrderStatusEnum.CANCELED,
    );

    const total_all_order = DATA_FILTERED?.reduce(
      (acc, cur) => acc + Number(cur.total_order),
      0,
    );
    const total_all_product_price =
      DATA_FILTERED?.reduce((acc, cur) => acc + cur.total_product_price, 0) ??
      0;
    const total_all_store_service_fee =
      DATA_FILTERED?.reduce(
        (acc, cur) => acc + cur.total_store_service_fee,
        0,
      ) ?? 0;
    const total_all_voucher_value =
      DATA_FILTERED?.reduce((acc, cur) => acc + cur.total_voucher_value, 0) ??
      0;
    const total_all_store_revenue =
      DATA_FILTERED?.reduce((acc, cur) => acc + cur.total_store_revenue, 0) ??
      0;

    return {
      all: result,
      total_all_order,
      total_all_product_price,
      total_all_store_service_fee,
      total_all_voucher_value,
      total_all_store_revenue,
    };
  }
}
