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
  coinLogs,
  delivers,
  orders,
  OrderStatusEnum,
  OrderTypeEnum,
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
import { and, between, count, eq, inArray, isNull, or, sql, sum } from 'drizzle-orm';
import { DateTime } from 'luxon';

export type RevenueResult = {
  status: OrderStatusEnum | null; // null cho dòng tổng
  total_order: number;
  total_user_service_fee?: number; // Chỉ có trong kết quả tổng
  total_product_price: number;
  total_user_payment: number;
  total_used_coin: number; // Chỉ có trong kết quả tổng
  total_store_service_fee: number;
  total_deliver_service_fee: number;
  total_voucher_value: number;
  total_app_revenue: number;
  total_app_revenue_tax: number; // Chỉ có trong kết quả tổng
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly storeService: StoresService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async getAdminRevenue(reqDto: AdminRevenueReqDto, payload: JwtPayloadType) {
    if (reqDto.from) {
      reqDto.from = DateTime.fromJSDate(reqDto.from)
        .setZone('Asia/Ho_Chi_Minh')
        .startOf('day')
        .toJSDate();
    }

    if (reqDto.to) {
      reqDto.to = DateTime.fromJSDate(reqDto.to)
        .setZone('Asia/Ho_Chi_Minh')
        .endOf('day')
        .toJSDate();
    }

    const statuses: OrderStatusEnum[] = Object.values(OrderStatusEnum);
    const results = await this.db
      .select({
        status: orders.status,
        total_order: count(orders.id).mapWith(Number),
        total_product_price: sum(orders.totalProduct).mapWith(Number),
        total_user_payment: sum(orders.total).mapWith(Number),
        total_user_service_fee: sum(orders.userServiceFee).mapWith(Number),
        total_used_coin: sum(orders.coinUsed).mapWith(Number),
        total_store_service_fee: sum(orders.storeServiceFee).mapWith(Number),
        total_voucher_value: sum(orders.totalVoucherApp).mapWith(Number),
        total_deliver_service_fee: sql<number>`SUM
          ((
        ${orders.totalDelivery}
        +
        ${orders.nightFee}
        +
        ${orders.rainFee}
        )
        -
        ${orders.incomeDeliver}
        )`.mapWith(Number),
        total_app_revenue: sql<number>`
          ( SUM (${orders.storeServiceFee}) +
            SUM (${orders.userServiceFee}) +
            (SUM (${orders.totalDelivery}) + SUM (${orders.rainFee}) + SUM (${orders.nightFee})- SUM (${orders.incomeDeliver})))
        `.mapWith(Number),
        // thuế 1,5% trên total_app_revenue
        total_app_revenue_tax: sql<number>`COALESCE
          ( SUM(
        ${orders.storeServiceFee}
        +
        ${orders.userServiceFee}
        +
        ${orders.totalDelivery}
        +
        ${orders.rainFee}
        +
        ${orders.nightFee}
        -
        ${orders.incomeDeliver}
        )
        *
        0.015,
        0
        )`.mapWith(Number),
      })
      .from(orders)
      .where(
        and(
          ...(payload.role === RoleEnum.MANAGEMENT ? [eq(orders.areaId, payload.areaId)] : []),
          ...(reqDto.areaId ? [eq(orders.areaId, reqDto.areaId)] : []),
          ...(reqDto.from && reqDto.to ? [between(orders.createdAt, reqDto.from, reqDto.to)] : []),
        ),
      )
      .groupBy(orders.status);

    console.log('results', results);

    const result = statuses.map((status) => {
      const filterData = results.find((r) => r.status === status) || {
        total_order: 0,
        total_app_revenue_tax: 0,
        total_product_price: 0,
        total_user_payment: 0,
        total_used_coin: 0,
        total_store_service_fee: 0,
        total_user_service_fee: 0,
        total_deliver_service_fee: 0,
        total_issued_coin: 0,
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
        total_used_coin: filterData.total_used_coin,
        total_deliver_service_fee: filterData.total_deliver_service_fee,
        total_voucher_value: filterData.total_voucher_value,
        total_app_revenue: filterData.total_app_revenue,
        total_app_revenue_tax: filterData.total_app_revenue_tax,
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
    result.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

    // chỉ là đơn hoàn thành
    const DATA_FILTERED = result.filter((item) => item.status === OrderStatusEnum.DELIVERED);
    const total_all: RevenueResult = {
      status: null, // Dòng tổng không có trạng thái
      total_order: DATA_FILTERED.reduce((acc, cur) => acc + cur.total_order, 0),
      total_product_price: DATA_FILTERED.reduce((acc, cur) => acc + cur.total_product_price, 0),
      total_user_payment: DATA_FILTERED.reduce((acc, cur) => acc + cur.total_user_payment, 0),
      total_store_service_fee: DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_store_service_fee,
        0,
      ),
      total_deliver_service_fee: DATA_FILTERED.reduce(
        (acc, cur) => acc + cur.total_deliver_service_fee,
        0,
      ),
      total_used_coin: DATA_FILTERED.reduce((acc, cur) => acc + (cur.total_used_coin || 0), 0),
      total_voucher_value: DATA_FILTERED.reduce((acc, cur) => acc + cur.total_voucher_value, 0),
      total_user_service_fee: DATA_FILTERED.reduce(
        (acc, cur) => acc + (cur.total_user_service_fee || 0),
        0,
      ),
      total_app_revenue: DATA_FILTERED.reduce((acc, cur) => acc + cur.total_app_revenue, 0),
      total_app_revenue_tax: DATA_FILTERED.reduce((acc, cur) => acc + cur.total_app_revenue_tax, 0),
    };

    // lấy ra thống kê số xu phát hành
    const total_issued_coin = await this.db
      .select({
        total_issued_coin: sum(coinLogs.coin).mapWith(Number),
      })
      .from(coinLogs)
      .where(
        and(
          ...(reqDto.from && reqDto.to
            ? [
                between(
                  coinLogs.createdAt,
                  DateTime.fromJSDate(reqDto.from)
                    .setZone('Asia/Ho_Chi_Minh')
                    .startOf('day')
                    .toJSDate(),
                  DateTime.fromJSDate(reqDto.to)
                    .setZone('Asia/Ho_Chi_Minh')
                    .endOf('day')
                    .toJSDate(),
                ),
              ]
            : []),
        ),
      )
      .then((data) => data[0]?.total_issued_coin || 0);

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
      total_issued_coin,
      total_used_coin: total_all.total_used_coin,
      total_all_app_revenue_tax: total_all.total_app_revenue_tax,
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
        total_user_service_fee: sum(orders.userServiceFee).mapWith(Number),
        total_user_payment: sum(orders.total).mapWith(Number),
        total_store_service_fee: sum(orders.storeServiceFee).mapWith(Number),
        total_store_revenue: sum(orders.payforShop).mapWith(Number),
        // thuế 1,5% trên tổng doanh thu cửa hàng
        total_product_tax: sum(orders.totalProductTax).mapWith(Number),
        total_voucher_value: sum(orders.totalVoucherStore).mapWith(Number),
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .leftJoin(users, eq(users.id, stores.userId))
      .groupBy(orders.status)
      .where(
        and(
          inArray(orders.type, [OrderTypeEnum.FOOD, OrderTypeEnum.ANOTHER_SHOP]),
          ...(payload.role === RoleEnum.MANAGEMENT ? [eq(stores.areaId, payload.areaId)] : []),
          ...(reqDto.q ? [or(eq(users.phone, reqDto.q), eq(stores.name, reqDto.q))] : []),
          ...(reqDto.from && reqDto.to
            ? [
                between(
                  orders.createdAt,
                  DateTime.fromJSDate(reqDto.from)
                    .setZone('Asia/Ho_Chi_Minh')
                    .startOf('day')
                    .toJSDate(),
                  DateTime.fromJSDate(reqDto.to)
                    .setZone('Asia/Ho_Chi_Minh')
                    .endOf('day')
                    .toJSDate(),
                ),
              ]
            : []),
        ),
      );

    const mergedResults = result.map((item) => {
      return {
        ...item,
      };
    });

    const formattedResult = statuses.map((status) => {
      const filterData = mergedResults.find((r) => r.status === status) || {
        total_order: 0,
        total_product_price: 0,
        total_user_service_fee: 0,
        total_product_tax: 0,
        total_user_payment: 0,
        total_store_service_fee: 0,
        total_voucher_value: 0,
        total_store_revenue: 0,
      };

      return {
        status,
        total_order: filterData.total_order,
        total_product_tax: filterData.total_product_tax,
        total_product_price: filterData.total_product_price,
        total_user_payment: filterData.total_user_payment,
        total_user_service_fee: filterData.total_user_service_fee,
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
    formattedResult.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

    // ✅ Tính tổng trừ các đơn hàng đã hủy
    const DATA_FILTERED = formattedResult.filter(
      (status) => status.status === OrderStatusEnum.DELIVERED,
    );
    const total_all_order = DATA_FILTERED.reduce((acc, cur) => acc + Number(cur.total_order), 0);
    const total_all_product_price =
      DATA_FILTERED.reduce((acc, cur) => acc + cur.total_product_price, 0) ?? 0;
    const total_all_store_service_fee =
      DATA_FILTERED.reduce((acc, cur) => acc + cur.total_store_service_fee, 0) ?? 0;
    const total_all_voucher_value =
      DATA_FILTERED.reduce((acc, cur) => acc + cur.total_voucher_value, 0) ?? 0;
    const total_all_store_revenue =
      DATA_FILTERED.reduce((acc, cur) => acc + cur.total_store_revenue, 0) ?? 0;
    const total_all_user_service_fee =
      DATA_FILTERED.reduce((acc, cur) => acc + (cur.total_user_service_fee || 0), 0) ?? 0;
    const total_all_product_tax =
      DATA_FILTERED.reduce((acc, cur) => acc + cur.total_product_tax, 0) ?? 0;
    return plainToInstance(StoreRevenueResDto, {
      all: formattedResult,
      total_all_order,
      total_all_product_price,
      total_all_store_service_fee,
      total_all_voucher_value,
      total_all_store_revenue,
      total_all_user_service_fee,
      total_all_product_tax,
    });
  }

  async getMyStoreRevenue(reqDto: StoreRevenueReqDto, payload: JwtPayloadType) {
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
        total_store_service_fee: sum(sql`${orders.totalProduct}
        -
        ${orders.payforShop}`).mapWith(Number),
        total_store_revenue: sum(orders.payforShop).mapWith(Number),
        // thuế
        total_product_tax: sum(orders.totalProductTax).mapWith(Number),
        total_voucher_value: sum(orders.totalVoucherStore).mapWith(Number),
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
            DateTime.fromJSDate(reqDto.from).setZone('Asia/Ho_Chi_Minh').startOf('day').toJSDate(),
            DateTime.fromJSDate(reqDto.to).setZone('Asia/Ho_Chi_Minh').endOf('day').toJSDate(),
          ),
        ),
      )
      .groupBy(orders.status);

    const mergedResults = orderFilter.map((item) => {
      return {
        ...item,
      };
    });
    const result = statuses.map((status) => {
      const filterData = mergedResults.find((r) => r.status === status) || {
        total_order: 0,
        total_product_tax: 0,
        total_product_price: 0,
        total_store_service_fee: 0,
        total_voucher_value: 0,
        total_store_revenue: 0,
      };

      return {
        status,
        total_order: filterData.total_order,
        total_product_tax: filterData.total_product_tax,
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

    result.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

    // ✅ Tính tổng trừ các đơn hàng đã hủy
    const DATA_FILTERED = result.filter((item) => item.status !== OrderStatusEnum.CANCELED);

    const total_all_order = DATA_FILTERED?.reduce((acc, cur) => acc + Number(cur.total_order), 0);
    const total_all_product_price =
      DATA_FILTERED?.reduce((acc, cur) => acc + cur.total_product_price, 0) ?? 0;
    const total_all_store_service_fee =
      DATA_FILTERED?.reduce((acc, cur) => acc + cur.total_store_service_fee, 0) ?? 0;
    const total_all_voucher_value =
      DATA_FILTERED?.reduce((acc, cur) => acc + cur.total_voucher_value, 0) ?? 0;
    const total_all_store_revenue =
      DATA_FILTERED?.reduce((acc, cur) => acc + cur.total_store_revenue, 0) ?? 0;
    const total_all_product_tax =
      DATA_FILTERED?.reduce((acc, cur) => acc + cur.total_product_tax, 0) ?? 0;

    return {
      all: result,
      total_all_order,
      total_all_product_price,
      total_all_store_service_fee,
      total_all_voucher_value,
      total_all_store_revenue,
      total_all_product_tax,
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
        total_order_delivered: sql
          .raw(
            `
        COALESCE(
          COUNT(orders.id) FILTER (WHERE orders.status = 'DELIVERED'),
          0
        )
      `,
          )
          .mapWith(Number)
          .as('totalOrderDelivered'),
        total_order_canceled: sql
          .raw(
            `
        COALESCE(
          COUNT(orders.id) FILTER (WHERE orders.status = 'CANCELED'),
          0
        )
      `,
          )
          .mapWith(Number),
        total_deliver_point: delivers.point,
        total_income: sql
          .raw(
            `
          COALESCE(
            SUM(orders.income_deliver) FILTER (WHERE orders.status = 'DELIVERED'),
            0
          )
        `,
          )
          .mapWith(Number)
          .as('totalIncome'),
        total_income_tax: sql
          .raw(
            `
              SUM(
                CASE
                  WHEN orders.status = 'DELIVERED' THEN orders.delivery_income_tax
                  ELSE 0
                END
              )
            `,
          )
          .mapWith(Number)
          .as('total_income_tax'),
      })
      .from(delivers)
      .leftJoin(orders, eq(orders.deliverId, delivers.id))
      .leftJoin(reasonDeliverCancelOrders, eq(reasonDeliverCancelOrders.orderId, orders.id))
      .where(
        and(
          isNull(delivers.deletedAt),
          ...(payload.role === RoleEnum.MANAGEMENT ? [eq(delivers.areaId, payload.areaId)] : []),
          ...(reqDto.phone ? [eq(delivers.phone, reqDto.phone)] : []),
          ...(reqDto.from && reqDto.to
            ? [
                between(
                  orders.createdAt,
                  DateTime.fromJSDate(reqDto.from)
                    .setZone('Asia/Ho_Chi_Minh')
                    .startOf('day')
                    .toJSDate(),
                  DateTime.fromJSDate(reqDto.to)
                    .setZone('Asia/Ho_Chi_Minh')
                    .endOf('day')
                    .toJSDate(),
                ),
              ]
            : []),
        ),
      )
      .groupBy(delivers.id);

    const total_income = result.reduce((acc, cur) => acc + (cur.total_income || 0), 0);
    const total_all_orders = result.reduce((acc, cur) => acc + (cur.total_orders || 0), 0);
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
    const total_income_tax = result.reduce((acc, cur) => acc + (cur.total_income_tax || 0), 0);
    console.log('total_all_order_delivered', total_all_order_delivered);
    return plainToInstance(DeliverRevenueResDto, {
      data: result,
      total_all_income: total_income,
      total_all_orders,
      total_all_order_delivered,
      total_all_order_canceled,
      total_all_income_tax: total_income_tax,
      total_all_deliver_point: total_deliver_point,
    });
  }
}
