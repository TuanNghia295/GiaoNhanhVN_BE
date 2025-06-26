import { AdminRevenueReqDto } from '@/api/analytics/dto/admin-revenue.req.dto';
import { AdminRevenueResDto } from '@/api/analytics/dto/admin-revenue.res.dto';
import { DeliverRevenueReqDto } from '@/api/analytics/dto/deliver-revenue.req.dto';
import { DeliverRevenueResDto } from '@/api/analytics/dto/deliver-revenue.res.dto';
import { StoreRevenueReqDto } from '@/api/analytics/dto/store-revenue.req.dto';
import { StoreRevenueResDto } from '@/api/analytics/dto/store-revenue.res.dto';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { StoresService } from '@/api/stores/stores.service';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import {
  delivers,
  orders,
  OrderStatusEnum,
  reasonDeliverCancelOrders,
  RoleEnum,
  stores,
  users,
  vouchers,
  vouchersOnOrders,
} from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { endOfDay, startOfDay } from 'date-fns';
import { and, between, count, eq, isNull, or, sql, sum } from 'drizzle-orm';

export type RevenueResult = {
  status: OrderStatusEnum | null; // null cho dòng tổng
  total_order: number;
  total_user_service_fee?: number; // Chỉ có trong kết quả tổng
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

  async getAdminRevenue(reqDto: AdminRevenueReqDto, payload: JwtPayloadType) {
    const statuses: OrderStatusEnum[] = Object.values(OrderStatusEnum);
    const results = await this.db
      .select({
        status: orders.status,
        total_order: count(orders.id).mapWith(Number),
        total_product_price: sum(orders.totalProduct).mapWith(Number),
        total_user_payment: sum(orders.total).mapWith(Number),
        total_user_service_fee: sum(orders.userServiceFee).mapWith(Number),
        total_store_service_fee: sum(orders.storeServiceFee).mapWith(Number),
        total_deliver_service_fee: sql<number>`SUM
          (${orders.totalDelivery} - ${orders.incomeDeliver})`.mapWith(Number),
        total_voucher_value: sql
          .raw(
            `
          SUM(
            CASE 
              WHEN (vouchers.type = 'MANAGEMENT' OR vouchers.type = 'ADMIN')
              AND vouchers_on_orders.order_id IS NOT NULL 
              THEN vouchers.value
              ELSE 0 
            END
          )
        `,
          )
          .mapWith(Number),

        total_app_revenue: sql<number>`
          ( SUM(${orders.totalProduct}) - SUM(${orders.payforShop}) +
            SUM(${orders.userServiceFee}) +
            (SUM(${orders.totalDelivery}) - SUM(${orders.incomeDeliver})) -
            SUM(
            CASE
            WHEN ${vouchers.managerId} IS NOT NULL
            AND vouchers_on_orders.order_id IS NOT NULL
            THEN vouchers.value
            ELSE 0
            END
            ))
        `.mapWith(Number),
      })
      .from(orders)
      .leftJoin(vouchersOnOrders, eq(orders.id, vouchersOnOrders.orderId))
      .leftJoin(vouchers, eq(vouchersOnOrders.voucherId, vouchers.id))
      .where(
        and(
          ...(payload.role === RoleEnum.MANAGEMENT
            ? [eq(orders.areaId, payload.areaId)]
            : []),
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
        total_user_service_fee: 0,
        total_deliver_service_fee: 0,
        total_voucher_value: 0,
        total_app_revenue: 0,
      };

      return {
        status,
        total_order: filterData.total_order,
        total_user_service_fee: filterData.total_user_service_fee,
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
      total_order: DATA_FILTERED.reduce((acc, cur) => acc + cur.total_order, 0),
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
      total_user_service_fee: DATA_FILTERED.reduce(
        (acc, cur) => acc + (cur.total_user_service_fee || 0),
        0,
      ),
      total_app_revenue: DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_app_revenue,
        0,
      ),
    };

    console.log('total_all', total_all);

    return plainToInstance(AdminRevenueResDto, {
      all: result,
      total_user_service_fee: total_all.total_user_service_fee,
      total_all_order: total_all.total_order,
      total_all_product_price: total_all.total_product_price,
      total_all_user_payment: total_all.total_user_payment,
      total_all_store_service_fee: total_all.total_store_service_fee,
      total_all_deliver_service_fee: total_all.total_deliver_service_fee,
      total_all_voucher_value: total_all.total_voucher_value,
      total_all_app_revenue: total_all.total_app_revenue,
    });
  }

  async getStoreRevenue(
    reqDto: StoreRevenueReqDto,
    payload: JwtPayloadType,
  ): Promise<StoreRevenueResDto> {
    const statuses: OrderStatusEnum[] = Object.values(OrderStatusEnum);

    const result = await this.db
      .select({
        status: orders.status,
        total_order: count(orders.id).mapWith(Number).as('total_order'),
        total_product_price: sum(orders.totalProduct).mapWith(Number),
        total_user_payment: sum(orders.total).mapWith(Number),
        total_store_service_fee: sum(sql`${orders.totalProduct} -
        ${orders.payforShop}`).mapWith(Number),
        total_voucher_value: sql
          .raw(
            `
                SUM(
                  CASE 
                    WHEN vouchers.type = 'STORE'
                    AND vouchers_on_orders.order_id IS NOT NULL 
                    THEN vouchers.value
                    ELSE 0 
                  END
                )
              `,
          )
          .mapWith(Number),
        total_store_revenue: sum(orders.payforShop).mapWith(Number),
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .leftJoin(users, eq(users.id, stores.userId))
      .leftJoin(vouchersOnOrders, eq(vouchersOnOrders.orderId, orders.id))
      .leftJoin(vouchers, eq(vouchers.id, vouchersOnOrders.voucherId))
      .groupBy(orders.status)
      .where(
        and(
          ...(payload.role === RoleEnum.MANAGEMENT
            ? [eq(stores.areaId, payload.areaId)]
            : []),
          ...(reqDto.q
            ? [or(eq(users.phone, reqDto.q), eq(stores.name, reqDto.q))]
            : []),
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
      );
    const orderFilterMap = new Map(result.map((item) => [item.status, item]));

    const formattedResult = statuses.map((status) => {
      const filterData = orderFilterMap.get(status) || {
        total_order: 0,
        total_product_price: 0,
        total_user_payment: 0,
        total_store_service_fee: 0,
        total_voucher_value: 0,
        total_store_revenue: 0,
      };

      return {
        status,
        total_order: filterData.total_order,
        total_product_price: filterData.total_product_price,
        total_user_payment: filterData.total_user_payment,
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
    formattedResult.sort(
      (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
    );

    // ✅ Tính tổng trừ các đơn hàng đã hủy
    const DATA_FILTERED = formattedResult.filter(
      (item) => item.status !== OrderStatusEnum.CANCELED,
    );
    const total_all_order = DATA_FILTERED.reduce(
      (acc, cur) => acc + Number(cur.total_order),
      0,
    );
    const total_all_product_price =
      DATA_FILTERED.reduce((acc, cur) => acc + cur.total_product_price, 0) ?? 0;
    const total_all_store_service_fee =
      DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_store_service_fee,
        0,
      ) ?? 0;
    const total_all_voucher_value =
      DATA_FILTERED.reduce((acc, cur) => acc + cur.total_voucher_value, 0) ?? 0;
    const total_all_store_revenue =
      DATA_FILTERED.reduce((acc, cur) => acc + cur.total_store_revenue, 0) ?? 0;
    return plainToInstance(StoreRevenueResDto, {
      all: formattedResult,
      total_all_order,
      total_all_product_price,
      total_all_store_service_fee,
      total_all_voucher_value,
      total_all_store_revenue,
    });
  }

  async getMyStoreRevenue(reqDto: StoreRevenueReqDto, payload: JwtPayloadType) {
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
        total_product_price: sum(orders.totalProduct).mapWith(Number),
        total_store_service_fee: sum(sql`${orders.totalProduct} -
        ${orders.payforShop}`).mapWith(Number),
        total_voucher_value: sql
          .raw(
            `
          SUM(
            CASE 
              WHEN vouchers.type = 'STORE'
              AND vouchers_on_orders.order_id IS NOT NULL 
              THEN vouchers.value
              ELSE 0 
            END
          )
        `,
          )
          .mapWith(Number),
        total_store_revenue: sum(orders.payforShop).mapWith(Number),
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

  async getDeliverRevenue(
    reqDto: DeliverRevenueReqDto,
    payload: JwtPayloadType,
  ): Promise<DeliverRevenueResDto> {
    const result = await this.db
      .select({
        phone: delivers.phone,
        full_name: delivers.fullName,
        total_orders: count(orders.id).mapWith(Number),
        total_order_delivered: sql<number>`COALESCE
          ( COUNT(${orders.id}) FILTER (WHERE ${orders.status} = 'DELIVERED'), 0)`
          .mapWith(Number)
          .as('totalOrderDelivered'),
        total_order_canceled: sql<number>`COALESCE
          ( COUNT(${orders.id}) FILTER (WHERE ${orders.status} = 'CANCELED'), 0)`
          .mapWith(Number)
          .as('totalOrderCanceled'),
        total_deliver_point: delivers.point,
        total_income: sql<number>`COALESCE
          ( SUM(${orders.incomeDeliver}) FILTER (WHERE ${orders.status} = 'DELIVERED'), 0)`
          .mapWith(Number)
          .as('totalIncome'),
      })
      .from(delivers)
      .leftJoin(orders, eq(orders.deliverId, delivers.id))
      .leftJoin(
        reasonDeliverCancelOrders,
        eq(reasonDeliverCancelOrders.orderId, orders.id),
      )
      .where(
        and(
          isNull(delivers.deletedAt),
          ...(payload.role === RoleEnum.MANAGEMENT
            ? [eq(delivers.areaId, payload.areaId)]
            : []),
          ...(reqDto.phone ? [eq(delivers.phone, reqDto.phone)] : []),
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
      .groupBy(delivers.id);

    const total_income = result.reduce(
      (acc, cur) => acc + (cur.total_income || 0),
      0,
    );
    const total_all_orders = result.reduce(
      (acc, cur) => acc + (cur.total_orders || 0),
      0,
    );
    const total_all_order_delivered = result.reduce(
      (acc, cur) => acc + (cur.total_order_delivered || 0),
      0,
    );
    const total_all_order_canceled = result.reduce(
      (acc, cur) => acc + (cur.total_order_canceled || 0),
      0,
    );
    const total_deliver_point = result.reduce(
      (acc, cur) => acc + (cur.total_deliver_point || 0),
      0,
    );
    console.log('total_all_order_delivered', total_all_order_delivered);
    return plainToInstance(DeliverRevenueResDto, {
      data: result,
      total_all_income: total_income,
      total_all_orders,
      total_all_order_delivered,
      total_all_order_canceled,
      total_all_deliver_point: total_deliver_point,
    });
  }
}
