import { AreasService } from '@/api/areas/areas.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { DeliversService } from '@/api/delivers/delivers.service';
import { CreateOrderDetailReqDto } from '@/api/order-details/dto/create-order-detail.req.dto';
import { CalculateOrderReqDto } from '@/api/orders/dto/calculate-order.req.dto';
import { OrderCreateReqDto } from '@/api/orders/dto/order-create.req.dto';
import { OrderResDto } from '@/api/orders/dto/order.res.dto';
import { PageMyOrderReqDto } from '@/api/orders/dto/page-my-order.req.dto';
import { PageOrderReqDto } from '@/api/orders/dto/query-order.req.dto';
import { UpdateStatusOrderReqDto } from '@/api/orders/dto/update-status-order.req.dto';
import { StoresService } from '@/api/stores/stores.service';
import { UsersService } from '@/api/users/users.service';
import { VouchersService } from '@/api/vouchers/vouchers.service';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OrdersOffsetPaginatedResDto } from '@/common/dto/offset-pagination/orders-offset-paginated.res.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, Transaction } from '@/database/global';
import {
  Area,
  areas,
  CanceledReasonEnum,
  Deliver,
  delivers,
  Distance,
  distances,
  extrasToOrderDetails,
  Order,
  orderDetails,
  orders,
  OrderStatusEnum,
  OrderTypeEnum,
  reasonDeliverCancelOrders,
  RoleEnum,
  serviceFees,
  Setting,
  settings,
  stores,
  vouchers,
  vouchersOnOrders,
  VouchersTypeEnum,
} from '@/database/schemas';
import { voucherUsages } from '@/database/schemas/voucher-usage.schema';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { GoongService } from '@/shared/goong.service';
import { buildMulticastMessage } from '@/utils/firebase.util';
import { allowedTransitions } from '@/utils/util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Big } from 'big.js';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import { endOfDay, getHours, startOfDay } from 'date-fns';
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  SQL,
  sql,
} from 'drizzle-orm';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { FIREBASE_ADMIN } from '../../firebase/firebase.module';

export interface CalculateResponse {
  sessionId: string;
  distance: number;
  incomeDeliver: number;
  userServiceFee: number;
  totalDelivery: number;
  distanceFee: number;
  isHoliday: boolean;
  isRain: boolean;
  areaId: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly areasService: AreasService,
    private readonly usersService: UsersService,
    private readonly storesService: StoresService,
    private readonly emitter: EventEmitter2,
    private readonly vouchersService: VouchersService,
    private readonly goongService: GoongService,
    @Inject(forwardRef(() => DeliversService))
    private readonly deliversService: DeliversService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    @Inject(FIREBASE_ADMIN) private readonly admin: admin.app.App,
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  private readonly logger = new Logger(OrdersService.name);

  async getPageOrders(reqDto: PageOrderReqDto, payload: JwtPayloadType) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.orders> = {
      with: {
        store: true,
        vouchers: true,
        reasonDeliverCancelOrder: true,
        deliver: true,
        orderDetails: {
          with: {
            product: true,
            option: true,
            extras: {
              with: {
                extra: true,
              },
            },
          },
        },
      },
    };

    const whereClauses: SQL[] = [
      between(
        orders.createdAt,
        startOfDay(new Date(reqDto.from ?? Date.now())),
        endOfDay(new Date(reqDto.to ?? Date.now())),
      ),
      ...(reqDto.q ? [ilike(orders.code, `%${reqDto.q}%`)] : []),
      ...(reqDto.areaId ? [eq(orders.areaId, reqDto.areaId)] : []),
      ...(reqDto.status ? [eq(orders.status, reqDto.status)] : []),
      ...(reqDto.type ? [eq(orders.type, reqDto.type)] : []),
    ];

    if (payload.role === RoleEnum.STORE) {
      whereClauses.push(
        inArray(
          orders.storeId,
          this.db
            .select({ id: stores.id })
            .from(stores)
            .where(eq(stores.userId, payload.id)),
        ),
      );
    }

    baseConfig.where = and(...whereClauses);

    const qCount = this.db.query.orders.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.orders.findMany({
        ...baseConfig,
        orderBy: desc(orders.createdAt),
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);
    console.log('entities', entities);

    const totalsOrders = Object.fromEntries(
      (
        await this.db
          .select({ status: orders.status, count: count(orders.id) })
          .from(orders)
          .where(
            and(
              between(
                orders.createdAt,
                startOfDay(new Date(reqDto.from ?? Date.now())),
                endOfDay(new Date(reqDto.to ?? Date.now())),
              ),
              ...(reqDto.q ? [ilike(orders.code, `%${reqDto.q}%`)] : []),
              ...(reqDto.areaId ? [eq(orders.areaId, reqDto.areaId)] : []),
              ...(reqDto.type ? [eq(orders.type, reqDto.type)] : []),
            ),
          )
          .groupBy(orders.status)
      ).map(({ status, count }) => [status, count]),
    );

    const totalOrdersForPaginated = {
      totalOrders: totalCount,
      totalOrdersPending: totalsOrders[OrderStatusEnum.PENDING] ?? 0,
      totalOrdersAccepted: totalsOrders[OrderStatusEnum.ACCEPTED] ?? 0,
      totalOrdersDelivering: totalsOrders[OrderStatusEnum.DELIVERING] ?? 0,
      totalOrdersDelivered: totalsOrders[OrderStatusEnum.DELIVERED] ?? 0,
      totalOrdersCancelled: totalsOrders[OrderStatusEnum.CANCELED] ?? 0,
    };

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OrdersOffsetPaginatedResDto(
      entities.map((e) => plainToInstance(OrderResDto, e)),
      meta,
      totalOrdersForPaginated,
    );
  }

  async findById(orderId: number) {
    return this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        store: true,
        orderDetails: {
          with: {
            product: true,
            option: true,
            extras: {
              with: {
                extra: true,
              },
            },
          },
        },
      },
    });
  }

  async existById(orderId: number) {
    return await this.db
      .select({
        id: orders.id,
        status: orders.status,
        deliverId: orders.deliverId,
        totalDelivery: orders.totalDelivery,
        incomeDeliver: orders.incomeDeliver,
        userServiceFee: orders.userServiceFee,
        storeServiceFee: orders.storeServiceFee,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)
      .then((res) => res[0]);
  }

  async calculate(reqDto: CalculateOrderReqDto) {
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);
    let area: Area & {
      distance?: number;
    } = null;

    //------------------------------------------------------------
    // B1 : Nếu tồn tại areaId thì lấy thông tin khu vực đó
    //------------------------------------------------------------
    if (reqDto.areaId) {
      area = await this.db.query.areas.findFirst({
        where: eq(areas.id, reqDto.areaId),
      });
    }

    //------------------------------------------------------------
    // B2 : Nếu không có areaId thì tìm khu vực gần nhất
    //------------------------------------------------------------
    if (!area) {
      area = await this.db
        .select({
          ...getTableColumns(areas),
          distance: sql
            .raw(
              `
        6371 * acos(
          cos(radians(${latitude})) *
          cos(radians(CAST(split_part(areas.location, ',', 1) AS double precision))) *
          cos(radians(CAST(split_part(areas.location, ',', 2) AS double precision)) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(CAST(split_part(areas.location, ',', 1) AS double precision)))
        )
      `,
            )
            .mapWith(Number)
            .as('distance'),
        })
        .from(areas)
        .leftJoin(settings, eq(areas.id, settings.areaId))
        .where(
          and(
            eq(settings.openFullTime, true),
            isNotNull(areas.location),
            // eq(areas.status, AreaStatusEnum.ACTIVE),
          ),
        )
        .orderBy(sql`${sql.raw('distance ASC')}`)
        .limit(1)
        .then((res) => res[0]);
    }

    console.log('area', area);

    if (!area) {
      throw new ValidationException(ErrorCode.AR001, HttpStatus.NOT_FOUND);
    }

    const response = await this.goongService.getDistanceMatrix(reqDto);
    const distance = Math.ceil(
      response.rows[0].elements[0].distance.value / 1000,
    );

    const setting = await this.db.query.settings.findFirst({
      where: eq(settings.areaId, area.id),
    });
    if (!setting) {
      throw new ValidationException(ErrorCode.ST001, HttpStatus.NOT_FOUND);
    }

    //----------------------------------------------------
    // Check if the order type is ANOTHER_SHOP
    // and set the order type to FOOD
    //-----------------------------------------------------

    const orderType =
      reqDto.orderType === OrderTypeEnum.ANOTHER_SHOP
        ? OrderTypeEnum.FOOD
        : reqDto.orderType;
    const serviceFeeWithType = await this.db.query.serviceFees.findFirst({
      where: and(
        eq(serviceFees.settingId, setting.id),
        eq(serviceFees.type, orderType), // bất kỳ loại nào
      ),
      with: {
        distance: {
          orderBy: asc(distances.minDistance),
        },
      },
    });
    if (!serviceFeeWithType) {
      throw new ValidationException(ErrorCode.SF001, HttpStatus.NOT_FOUND);
    }

    const distanceFee = await this.calculateDistanceFee(
      distance,
      serviceFeeWithType?.distance,
      serviceFeeWithType?.distancePct,
    );

    // phí dịch vụ môi trường
    // const envFeePct = await this.calculateEnvironmentFeePct(setting);

    // const totalDelivery = distanceFee + distanceFee * envFeePct;
    // phí dịch vụ
    const incomeDeliver =
      distanceFee * (1 - (serviceFeeWithType?.deliverFeePct ?? 0) / 100);

    // phí dịch vụ người dùng
    const userServiceFee =
      serviceFeeWithType.userServiceFee *
      (1 + (serviceFeeWithType.userServiceFeePct ?? 0) / 100);

    const sessionId = uuidv4();

    const payload: CalculateResponse = {
      sessionId: sessionId,
      distance: distance,
      incomeDeliver: incomeDeliver,
      userServiceFee: userServiceFee,
      totalDelivery: distanceFee,
      distanceFee: distanceFee,
      isHoliday: setting.isHoliday,
      isRain: setting.isRain,
      areaId: area.id,
    };
    // 24h
    await this.cache.set(sessionId, payload, 24 * 60 * 60 * 1000); // v
    return payload;
  }

  //hàm tính khoảng cách phí giao hàng
  private async calculateDistanceFee(
    totalDistance: number,
    distances: Distance[] = [],
    distancePct: number = 0,
  ) {
    let baseRate = new Big(0);
    const multiplier = new Big(1).plus(new Big(distancePct).div(100));

    while (totalDistance > 0) {
      const lastDistance = distances[distances.length - 1];

      if (totalDistance > lastDistance?.maxDistance) {
        const rate = new Big(lastDistance?.rate ?? 0);
        baseRate = baseRate.plus(rate.times(multiplier));
        totalDistance -= 1;
      } else {
        const matchedDistance = distances.find(
          (distance) =>
            totalDistance >= distance.minDistance &&
            totalDistance <= distance.maxDistance,
        );

        const rate = new Big(matchedDistance?.rate ?? 0);
        baseRate = baseRate.plus(rate.times(multiplier));
        totalDistance -= 1;
      }
    }

    return baseRate.toNumber();
  }

  //hàm tính phí dịch vụ môi tường
  private async calculateEnvironmentFeePct(setting: Setting) {
    const vnDate = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const currentHour = getHours(new Date(vnDate));
    const isDay = currentHour >= 6 && currentHour < 18;

    const nightFeePercent =
      setting.isNight && !isDay ? (setting.nightFeePct || 0) / 100 : 0;

    const rainFeePercent = setting.isRain
      ? isDay
        ? (setting.rainMorningPct || 0) / 100
        : (setting.rainNightPct || 0) / 100
      : 0;

    const totalFee = (rainFeePercent + nightFeePercent).toFixed(2);

    return parseFloat(totalFee);
  }

  private async applyVoucher(
    orderId: number,
    voucherId: number,
    payload: JwtPayloadType,
    tx: Transaction,
  ) {
    await this.vouchersService.ensureVoucherIsActive(voucherId, payload.id, tx);
    await Promise.all([
      tx.insert(vouchersOnOrders).values({ orderId: orderId, voucherId }),
      tx.insert(voucherUsages).values({ userId: payload.id, voucherId }),
    ]);
  }

  async create(payload: JwtPayloadType, reqDto: OrderCreateReqDto) {
    const calculateOrder = await this.cache.get<CalculateResponse>(
      reqDto.sessionId,
    );
    if (!calculateOrder) {
      throw new ValidationException(
        ErrorCode.OD001,
        HttpStatus.BAD_REQUEST,
        'sessionId không hợp lệ',
      );
    }

    return await this.db.transaction(async (tx) => {
      //---------------------------------------------------------------
      // Kiểm tra xem cửa hàng có hoạt động hay không
      //---------------------------------------------------------------
      if (reqDto.storeId) {
        await this.storesService.checkStoreActive(reqDto.storeId, tx);
      }
      const [order] = await tx
        .insert(orders)
        .values({
          ...reqDto,
          code: `DH${Date.now()}`,
          areaId: calculateOrder.areaId,
          storeId: reqDto.storeId,
          userId: payload.id,
        })
        .returning();

      // Kiểm tra voucher admin
      if (reqDto.voucherAdminId && reqDto.voucherAdminId > 0) {
        await this.applyVoucher(order.id, reqDto.voucherAdminId, payload, tx);
      }

      // Kiểm tra voucher cửa hàng
      if (reqDto.voucherStoreId && reqDto.voucherStoreId > 0) {
        await this.applyVoucher(order.id, reqDto.voucherStoreId, payload, tx);
      }
      // Tạo chi tiết đơn hàng
      if (reqDto.items && reqDto.items.length > 0) {
        await this.createOderDetails(order.id, reqDto.items, tx);
      }

      const [serviceFeeWithTypeFood] = await tx
        .select({
          ...getTableColumns(serviceFees),
        })
        .from(serviceFees)
        .innerJoin(settings, eq(serviceFees.settingId, settings.id))
        .where(
          and(
            eq(serviceFees.type, OrderTypeEnum.FOOD), // bất kỳ loại nào
            eq(settings.areaId, order.areaId),
          ),
        );

      // Tính tổng tiền sản phẩm khu có/không áp dụng voucher của cửa hàng
      await tx.execute(sql`
        WITH order_details_total AS (SELECT od.order_id, SUM(od.total) AS total_order_details
                                     FROM order_details od
                                     WHERE od.order_id = ${order.id}
                                     GROUP BY od.order_id),
             total_store_voucher AS (SELECT SUM(v.value) AS total_store
                                     FROM vouchers_on_orders ov
                                            JOIN vouchers v ON ov.voucher_id = v.id
                                     WHERE ov.order_id = ${order.id}
                                       AND v.type = ${VouchersTypeEnum.STORE})
        UPDATE orders o
        SET total_product     = GREATEST(odt.total_order_details, 0),
            total_voucher     = LEAST(odt.total_order_details, COALESCE(tsv.total_store, 0)),
            store_service_fee = GREATEST(
              odt.total_order_details * (${serviceFeeWithTypeFood.pricePct}::numeric / 100) +
              COALESCE(${serviceFeeWithTypeFood.price}::numeric, 0) -
              COALESCE(tsv.total_store, 0),
              0),
            payfor_shop       = GREATEST(
              odt.total_order_details
                * (1 - ${serviceFeeWithTypeFood.pricePct}::numeric / 100) -
              COALESCE(${serviceFeeWithTypeFood.price}:: numeric, 0)
                - COALESCE(tsv.total_store, 0),
              0
                                )
        FROM order_details_total odt,
             total_store_voucher tsv
        WHERE o.id = ${order.id}
          AND odt.order_id = o.id;
      `);

      // Tính tiền ship khi có và không áp dụng voucher
      await tx.execute(sql`
        WITH tav AS (SELECT SUM(v.value) AS total_admin
                     FROM vouchers_on_orders ov
                            JOIN vouchers v ON ov.voucher_id = v.id
                     WHERE ov.order_id = ${order.id}
                       AND v.type IN (${VouchersTypeEnum.ADMIN}, ${VouchersTypeEnum.MANAGEMENT}))
        UPDATE orders
        SET total_delivery = GREATEST(${calculateOrder.totalDelivery} - COALESCE(tav.total_admin, 0), 0),
            total_voucher  = orders.total_voucher + LEAST(${calculateOrder.totalDelivery}, COALESCE(tav.total_admin, 0)),
            income_deliver = GREATEST(
              ${calculateOrder.totalDelivery}::numeric
                * (1 - ${serviceFeeWithTypeFood.deliverFeePct}::numeric / 100)
                - COALESCE(${serviceFeeWithTypeFood.price}::numeric, 0), 0)
        FROM tav
        WHERE orders.id = ${order.id};
      `);

      await tx.execute(sql`
        UPDATE orders
        SET user_service_fee = ${calculateOrder.userServiceFee},
            distance         = ${calculateOrder.distance},
            is_holiday       = ${calculateOrder.isHoliday},
            is_rain          = ${calculateOrder.isRain}
        WHERE id = ${order.id};
      `);
      await tx.execute(sql`
        UPDATE orders
        SET total = GREATEST(
          0,
          COALESCE(total_product, 0) +
          COALESCE(total_delivery, 0) +
          COALESCE(user_service_fee, 0) -
          COALESCE(total_voucher, 0))
        WHERE id = ${order.id};
      `);

      await this.emitter.emitAsync('order.created', order);
      const orderDetail = await tx.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: {
          store: true,
          user: true,
          vouchers: {
            with: {
              voucher: true,
            },
          },
          orderDetails: {
            with: {
              product: true,
              option: true,
              extras: {
                with: {
                  extra: true,
                },
              },
            },
          },
        },
      });
      // flatten vouchers array
      const mappedOrderDetail = {
        ...orderDetail,
        vouchers: Array.isArray(orderDetail.vouchers)
          ? orderDetail.vouchers.map((v) => v.voucher)
          : [],
      };
      return plainToInstance(OrderResDto, mappedOrderDetail);
    });
  }

  async createOderDetails(
    orderId: number,
    items: CreateOrderDetailReqDto[],
    tx: Transaction,
  ) {
    for (const item of items) {
      const [orderDetail] = await tx
        .insert(orderDetails)
        .values({
          ...item,
          orderId: orderId,
        })
        .returning();

      if (item.extras.length > 0) {
        // Tạo chi tiết đơn hàng cho các extras
        await tx
          .insert(extrasToOrderDetails)
          .values(
            item.extras.map((extra) => ({
              orderDetailId: orderDetail.id,
              extraId: extra.extraId,
              quantity: extra.quantity,
            })),
          )
          .returning();
      }

      // tính tổng chi tiết đơn hàng rồi update vào field total

      // lef join table options extras để lấy price

      await tx.execute(sql`
        UPDATE order_details
        SET total = (
          COALESCE(order_details.quantity * p.price, 0) +
          COALESCE((SELECT o.price FROM options o WHERE o.id = order_details.option_id), 0) +
          COALESCE((SELECT SUM(ex.price * etod.quantity)
                    FROM extras_to_order_details etod
                           JOIN extras ex ON ex.id = etod.extra_id
                    WHERE etod.order_detail_id = order_details.id), 0)
          )
        FROM products p
        WHERE order_details.product_id = p.id
      `);
    }
  }

  async getDetailById(orderId: number) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        store: true,
        vouchers: true,
        orderDetails: {
          with: {
            product: true,
            option: true,
            extras: {
              with: {
                extra: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new ValidationException(ErrorCode.OD001, HttpStatus.NOT_FOUND);
    }
    return order;
  }

  async getPageByUserId(userId: number, reqDto: PageMyOrderReqDto) {
    console.log('reqDto', reqDto);
    const baseConfig: FindManyQueryConfig<typeof this.db.query.orders> = {
      with: {
        store: true,
        vouchers: {
          with: {
            voucher: true,
          },
        },
        reasonDeliverCancelOrder: true,
        orderDetails: {
          with: {
            product: true,
            option: true,
            extras: {
              with: {
                extra: true,
              },
            },
          },
        },
      },
    };

    baseConfig.where = and(
      eq(orders.userId, userId),
      // ...(reqDto.status ? [inArray(orders.status, reqDto.status)] : []),
      // ...(reqDto.type ? [inArray(orders.type, reqDto.type)] : []),
    );

    const qCount = this.db.query.orders.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.orders.findMany({
        ...baseConfig,
        orderBy: desc(orders.createdAt),
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);
    // map lại vouchers là mảng voucher
    // 👉 Clean mapping: flatten vouchers array
    const mappedEntities = entities.map((entity) => ({
      ...entity,
      vouchers: Array.isArray(entity.vouchers)
        ? entity.vouchers.map((v) => v.voucher)
        : [],
    }));
    console.log('entities', mappedEntities[0].vouchers);

    const totalsOrders = Object.fromEntries(
      (
        await this.db
          .select({ status: orders.status, count: count(orders.id) })
          .from(orders)
          .where(
            and(...(reqDto.type ? [inArray(orders.type, reqDto.type)] : [])),
          )
          .groupBy(orders.status)
      ).map(({ status, count }) => [status, count]),
    );

    const totalOrdersForPaginated = {
      totalOrders: totalCount,
      totalOrdersPending: totalsOrders[OrderStatusEnum.PENDING] ?? 0,
      totalOrdersAccepted: totalsOrders[OrderStatusEnum.ACCEPTED] ?? 0,
      totalOrdersDelivering: totalsOrders[OrderStatusEnum.DELIVERING] ?? 0,
      totalOrdersDelivered: totalsOrders[OrderStatusEnum.DELIVERED] ?? 0,
      totalOrdersCancelled: totalsOrders[OrderStatusEnum.CANCELED] ?? 0,
    };

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OrdersOffsetPaginatedResDto(
      mappedEntities.map((e) => plainToInstance(OrderResDto, e)),
      meta,
      totalOrdersForPaginated,
    );
  }

  async updateOrderStatus(
    orderId: number,
    reqDto: UpdateStatusOrderReqDto,
    payload: JwtPayloadType,
  ) {
    //-----------------------------------------------------
    // Nếu đơn hàng đã bị hủy thì hoàn tiền voucher cho shipper
    //----------------------------------------------------------
    return await this.db.transaction(async (tx) => {
      const result = await tx.execute(
        sql`
          SELECT id,
                 status,
                 deliver_id                          AS "deliverId",
                 total_delivery::DOUBLE PRECISION    AS "totalDelivery",
                 income_deliver::DOUBLE PRECISION    AS "incomeDeliver",
                 user_service_fee::DOUBLE PRECISION  AS "userServiceFee",
                 store_service_fee::DOUBLE PRECISION AS "storeServiceFee"
          FROM orders
          WHERE id = ${orderId}
            FOR UPDATE
        `,
      );
      const existOrder = result.rows[0] as Order;

      if (!existOrder) {
        throw new ValidationException(ErrorCode.O001, HttpStatus.NOT_FOUND);
      }

      //-----------------------------------------------------
      // Không cho phép người dùng hủy đơn hàng đã được xác nhận
      //----------------------------------------------------------
      if (
        [RoleEnum.USER, RoleEnum.STORE].includes(payload.role) &&
        existOrder.status !== OrderStatusEnum.PENDING
      ) {
        throw new ValidationException(ErrorCode.OD003);
      }
      const currentStatus = existOrder.status;
      const nextStatus = reqDto.status;

      if (!allowedTransitions[currentStatus].includes(nextStatus)) {
        throw new ValidationException(
          ErrorCode.O002,
          HttpStatus.BAD_REQUEST,
          `Invalid status transition from ${currentStatus} to ${nextStatus}`,
        );
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: reqDto.status,
        })
        .where(eq(orders.id, orderId))
        .returning();

      switch (reqDto.status) {
        case OrderStatusEnum.CANCELED: {
          await this.managerDoCancelOrder(updatedOrder, tx);
          await this.emitter.emitAsync('order.canceled', {
            updatedOrder: updatedOrder,
            role: payload.role,
          });
          break;
        }
        default:
          await this.emitter.emitAsync('order.updated_status', updatedOrder);
      }
      return updatedOrder;
    });
  }

  async assignOrderToShipper(orderId: number, payload: JwtPayloadType) {
    return this.db.transaction(async (tx) => {
      //--------------------------------------------
      // Kiểm tra xem đơn hàng có tồn tại không
      //--------------------------------------------
      // Khóa đơn hàng bằng SELECT FOR UPDATE
      const result = await tx.execute(
        sql`
          SELECT id,
                 status,
                 deliver_id                          AS "deliverId",
                 total_delivery::DOUBLE PRECISION    AS "totalDelivery",
                 income_deliver::DOUBLE PRECISION    AS "incomeDeliver",
                 user_service_fee::DOUBLE PRECISION  AS "userServiceFee",
                 store_service_fee::DOUBLE PRECISION AS "storeServiceFee"
          FROM orders
          WHERE id = ${orderId}
            FOR UPDATE
        `,
      );
      const existOrder = result.rows[0] as Order;
      if (!existOrder) {
        throw new ValidationException(ErrorCode.OD001);
      }
      //--------------------------------------------
      // Kiểm tra xem đơn hàng đã được giao chưa
      //--------------------------------------------
      if (existOrder.status !== OrderStatusEnum.PENDING) {
        throw new ValidationException(ErrorCode.OD005);
      }
      //--------------------------------------------
      // Kiểm tra xem người giao hàng có tồn tại không
      //--------------------------------------------
      const existDeliver = await this.deliversService.existById(payload.id);
      if (!existDeliver) {
        throw new ValidationException(ErrorCode.D001);
      }
      //--------------------------------------------
      // Tổng point mà người giao hàng sẽ bị trừ khi nhận đơn
      //--------------------------------------------
      const subtractPoint = Big(existOrder.totalDelivery || 0)
        .minus(existOrder.incomeDeliver || 0)
        .plus(existOrder.userServiceFee || 0)
        .plus(existOrder.storeServiceFee || 0)
        .toNumber(); // nếu bạn cần giá trị kiểu number
      console.log('subtractPoint', subtractPoint);
      console.log('existDeliver.point', existDeliver.point);
      console.log('existOrder.totalDelivery', existOrder.totalDelivery);

      //--------------------------------------------
      // Kiểm tra xem người giao hàng có đủ điểm để nhận đơn không
      //--------------------------------------------
      if (existDeliver.point < subtractPoint) {
        throw new ValidationException(ErrorCode.D005);
      }

      await this.deliversService.subtractPoint(payload.id, subtractPoint, tx);
      const [updateOrder] = await tx
        .update(orders)
        .set({
          status: OrderStatusEnum.ACCEPTED,
          deliverId: payload.id,
        })
        .where(eq(orders.id, orderId))
        .returning();

      this.emitter.emit('order.accepted', orderId);
      return updateOrder;
    });
  }

  async updateOrderStatusByDeliver(
    orderId: number,
    status: OrderStatusEnum,
    reason: string,
  ) {
    //--------------------------------------------
    // Kiểm tra xem đơn hàng có tồn tại không
    //--------------------------------------------
    const existOrder = await this.findById(orderId);
    if (!existOrder) {
      throw new ValidationException(ErrorCode.OD001);
    }

    if (
      existOrder.status === OrderStatusEnum.PENDING ||
      existOrder.status === status
    ) {
      throw new ValidationException(ErrorCode.OD002);
    }
    const currentStatus = existOrder.status;
    const nextStatus = status;
    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new ValidationException(
        ErrorCode.O002,
        HttpStatus.BAD_REQUEST,
        `Invalid status transition from ${currentStatus} to ${nextStatus}`,
      );
    }

    //--------------------------------------------
    // Kiểm tra xem người giao hàng có tồn tại không
    //--------------------------------------------
    const existDeliver = await this.deliversService.findById(
      existOrder.deliverId,
    );
    if (!existDeliver) {
      throw new ValidationException(ErrorCode.D001);
    }
    return this.db.transaction(async (tx) => {
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: status,
        })
        .where(eq(orders.id, orderId))
        .returning();
      switch (status) {
        case OrderStatusEnum.CANCELED: {
          //--------------------------------------------
          // Kiểm tra xem lý do hủy đơn hàng có tồn tại không
          //--------------------------------------------
          await this.doCancelOrder(updatedOrder, existDeliver, reason, tx);
          await this.emitter.emitAsync('order.canceled', {
            updatedOrder: updatedOrder,
            role: RoleEnum.DELIVER,
          });
          break;
        }
        case OrderStatusEnum.DELIVERED:
          await this.doCompleteOrder(updatedOrder, existDeliver, tx);
          await this.emitter.emitAsync('order.updated_status', updatedOrder);
          break;
        default:
          await this.emitter.emitAsync('order.updated_status', updatedOrder);
          break;
      }

      return updatedOrder;
    });
  }

  private async managerDoCancelOrder(existOrder: Order, tx: Transaction) {
    if (existOrder.deliverId) {
      const existDeliver = await this.deliversService.findById(
        existOrder.deliverId,
      );
      if (!existDeliver) {
        throw new ValidationException(ErrorCode.D001);
      }
      //-------------------------------------------------
      // Cộng lại điểm cho người giao hàng
      //-------------------------------------------------
      const subtractPoint = Big(existOrder.totalDelivery || 0)
        .minus(existOrder.incomeDeliver || 0)
        .plus(existOrder.userServiceFee || 0)
        .plus(existOrder.storeServiceFee || 0)
        .toNumber(); // nếu bạn cần giá trị kiểu number

      await this.deliversService.addPoint(
        existOrder.deliverId,
        subtractPoint,
        tx,
      );
    }
    //-------------------------------------------------
    // Gửi thông báo FCM  cho người dùng về việc hủy đơn hàng
    //-------------------------------------------------
    const validUserFcmToken = await this.usersService.getValidUserFcmTokenById(
      existOrder.userId,
    );
    console.log('validUserFcmToken', validUserFcmToken);
    if (validUserFcmToken.fcmToken) {
      try {
        await this.admin
          .messaging()
          .sendEachForMulticast(
            buildMulticastMessage([validUserFcmToken.fcmToken], 'CANCEL_ORDER'),
          );
      } catch (error) {
        this.logger.error('Error sending FCM notification', error);
      }
    }
  }

  //Thực hiện hủy đơn hàng
  private async doCancelOrder(
    existOrder: Order,
    existDeliver: Deliver,
    reason: string,
    tx: Transaction,
  ) {
    if (!reason) {
      throw new ValidationException(ErrorCode.OD003);
    }
    // Hủy quá 3 đơn trong ngày thì không cho hủy
    const countOrder = await tx
      .select({
        count: count(reasonDeliverCancelOrders.id),
      })
      .from(reasonDeliverCancelOrders)
      .where(
        and(
          eq(reasonDeliverCancelOrders.deliverId, existOrder.deliverId),
          between(
            reasonDeliverCancelOrders.createdAt,
            startOfDay(new Date()),
            endOfDay(new Date()),
          ),
        ),
      )
      .then((res) => res[0]);

    if (countOrder.count > 3) {
      await this.lockDeliver(existOrder.deliverId);
      // bắn event out đăng nhập shipper
      await this.emitter.emitAsync('deliver.locked', existDeliver);
      throw new ValidationException(ErrorCode.OD003);
    }

    // Số điểm sẽ được cộng lại cho người giao hàng
    const subtractPoint = Big(existOrder.totalDelivery || 0)
      .minus(existOrder.incomeDeliver || 0)
      .plus(existOrder.userServiceFee || 0)
      .plus(existOrder.storeServiceFee || 0)
      .toNumber(); // nếu bạn cần giá trị kiểu number

    // Cộng lại điểm cho người giao hàng
    await this.deliversService.addPoint(
      existOrder.deliverId,
      subtractPoint,
      tx,
    );

    await tx.insert(reasonDeliverCancelOrders).values({
      orderId: existOrder.id,
      reason: reason,
      type: CanceledReasonEnum.NOTTAKEN,
      deliverId: existDeliver.id,
    });

    //-------------------------------------------------
    // Gửi thông báo FCM  cho người dùng về việc hủy đơn hàng
    //-------------------------------------------------
    const validUserFcmToken = await this.usersService.getValidUserFcmTokenById(
      existOrder.userId,
    );
    console.log('validUserFcmToken', validUserFcmToken);
    if (validUserFcmToken.fcmToken) {
      try {
        await this.admin
          .messaging()
          .sendEachForMulticast(
            buildMulticastMessage([validUserFcmToken.fcmToken], 'CANCEL_ORDER'),
          );
      } catch (error) {
        this.logger.error('Error sending FCM notification', error);
      }
    }
  }

  private async lockDeliver(deliverId: number) {
    await this.db
      .update(delivers)
      .set({
        status: false,
        activated: false,
      })
      .where(eq(delivers.id, deliverId));
  }

  // Thực hiện khi hoàn thành đơn hàng
  private async doCompleteOrder(
    existOrder: Order,
    existDeliver: Deliver,
    tx: Transaction,
  ) {
    const [refund] = await tx
      .select({
        refundPoint: sql<number>`
          LEAST
          ( ${existOrder.totalDelivery},
            COALESCE (SUM(${vouchers.value}), 0))
        `,
      })
      .from(orders)
      .leftJoin(vouchersOnOrders, eq(orders.id, vouchersOnOrders.orderId))
      .leftJoin(
        vouchers,
        and(
          eq(vouchers.id, vouchersOnOrders.voucherId),
          inArray(vouchers.type, [
            VouchersTypeEnum.ADMIN,
            VouchersTypeEnum.MANAGEMENT,
          ]),
        ),
      )
      .where(eq(orders.id, existOrder.id))
      .groupBy(orders.id);
    this.logger.log(
      `Refund point for deliver ${existDeliver.id} is ${refund.refundPoint}`,
    );
    await this.deliversService.addPoint(
      existDeliver.id,
      refund.refundPoint,
      tx,
    );
  }
}
