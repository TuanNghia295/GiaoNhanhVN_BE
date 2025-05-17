import { AreasService } from '@/api/areas/areas.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { DeliversService } from '@/api/delivers/delivers.service';
import { CreateOrderDetailReqDto } from '@/api/order-details/dto/create-order-detail.req.dto';
import { CalculateOrderReqDto } from '@/api/orders/dto/calculate-order.req.dto';
import { OrderCreateReqDto } from '@/api/orders/dto/order-create.req.dto';
import { PageMyOrderReqDto } from '@/api/orders/dto/page-my-order.req.dto';
import { PageOrderReqDto } from '@/api/orders/dto/query-order.req.dto';
import { UpdateStatusOrderReqDto } from '@/api/orders/dto/update-status-order.req.dto';
import { StoresService } from '@/api/stores/stores.service';
import { VouchersService } from '@/api/vouchers/vouchers.service';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OrdersOffsetPaginatedResDto } from '@/common/dto/offset-pagination/orders-offset-paginated.res.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, Transaction } from '@/database/global';
import {
  Deliver,
  Distance,
  distances,
  extrasToOrderDetails,
  Order,
  orderDetails,
  orders,
  OrderStatusEnum,
  OrderTypeEnum,
  RoleEnum,
  serviceFees,
  Setting,
  settings,
  stores,
  vouchers,
  vouchersOnOrders,
  VouchersTypeEnum,
} from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { GoongService } from '@/shared/goong.service';
import { allowedTransitions } from '@/utils/util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cache } from 'cache-manager';
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
  SQL,
  sql,
} from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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
    private readonly storesService: StoresService,
    private readonly emitter: EventEmitter2,
    private readonly vouchersService: VouchersService,
    private readonly goongService: GoongService,
    @Inject(forwardRef(() => DeliversService))
    private readonly deliversService: DeliversService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  async getPageOrders(reqDto: PageOrderReqDto, payload: JwtPayloadType) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.orders> = {
      with: {
        store: true,
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
      entities,
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
    const sanitizedProvince = reqDto.province?.replace(/'/g, '');
    const sanitizedParent = reqDto.parent?.replace(/'/g, '');
    const area = await this.areasService.existByIdOrNameParent({
      areaId: reqDto.areaId,
      name: sanitizedProvince,
      parent: sanitizedParent,
    });

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
    console.log('setting', setting, area.id);
    if (!setting) {
      throw new ValidationException(ErrorCode.ST001, HttpStatus.NOT_FOUND);
    }

    //----------------------------------------------------
    // Check if the order type is ANOTHER_SHOP
    // and set the order type to FOOD
    //-----------------------------------------------------

    const serviceFeeWithType = await this.db.query.serviceFees.findFirst({
      where: and(
        eq(serviceFees.settingId, setting.id),
        eq(serviceFees.type, reqDto.orderType), // bất kỳ loại nào
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
    console.log(serviceFeeWithType);

    const distanceFee = await this.calculateDistanceFee(
      distance,
      serviceFeeWithType?.distance,
      serviceFeeWithType?.distancePct,
    );

    // phí dịch vụ môi trường
    const envFeePct = await this.calculateEnvironmentFeePct(setting);
    console.log('distanceFee', distanceFee);

    const totalDelivery = distanceFee + distanceFee * envFeePct;
    // phí dịch vụ
    const incomeDeliver =
      (totalDelivery * (1 - (serviceFeeWithType?.deliverFeePct ?? 0))) / 100;

    // phí dịch vụ người dùng
    const userServiceFee =
      serviceFeeWithType.userServiceFee *
      (1 + (serviceFeeWithType.userServiceFeePct ?? 0) / 100);
    console.log('userServiceFee', userServiceFee);

    const sessionId = uuidv4();

    const payload: CalculateResponse = {
      sessionId: sessionId,
      distance: distance,
      incomeDeliver: incomeDeliver,
      userServiceFee: userServiceFee,
      totalDelivery: totalDelivery,
      distanceFee: distanceFee,
      isHoliday: setting.isHoliday,
      isRain: setting.isRain,
      areaId: area.id,
    };
    // 24h
    await this.cache.set(sessionId, payload, 24 * 60 * 60 * 1000);
    return payload;
  }

  //hàm tính khoảng cách phí giao hàng
  private async calculateDistanceFee(
    totalDistance: number,
    distances: Distance[] = [],
    distancePct: number = 0,
  ) {
    let baseRate = 0;
    while (totalDistance > 0) {
      // Lấy thông tin khoảng cách cuối cùng
      const lastDistance = distances[distances.length - 1];
      // Nếu vượt quá khoảng cách tối đa
      if (totalDistance > lastDistance?.maxDistance) {
        const rate = lastDistance?.rate ?? 0;
        console.log(`rate: ${rate}`);
        const multiplier = 1 + distancePct / 100;

        // Tính phí và giảm khoảng cách
        baseRate += rate * multiplier;
        totalDistance -= 1;
      } else {
        // Nếu không vượt quá khoảng cách tối đa
        const rate = distances.find(
          (distance) =>
            totalDistance >= distance.minDistance &&
            totalDistance <= distance.maxDistance,
        ).rate;
        const multiplier = 1 + distancePct / 100;
        baseRate += rate * multiplier;
        totalDistance -= 1;
      }
    }
    // Trả về phí giao hàng
    return baseRate;
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

  async create(payload: JwtPayloadType, reqDto: OrderCreateReqDto) {
    if (!reqDto.province && reqDto.type !== OrderTypeEnum.FOOD) {
      throw new ValidationException(ErrorCode.AR001, HttpStatus.BAD_REQUEST);
    }
    const sanitizedProvince = reqDto.province?.replace(/'/g, '');
    const sanitizedParent = reqDto.parent?.replace(/'/g, '');

    const area = await this.areasService.existByIdOrNameParent({
      areaId: reqDto.areaId,
      name: sanitizedProvince,
      parent: sanitizedParent,
    });
    if (!area) {
      throw new ValidationException(ErrorCode.AR001, HttpStatus.BAD_REQUEST);
    }

    // Kiểm tra xem cửa hàng có hoạt động hay không
    // const store = await this.storesService.checkStoreActive(reqDto.storeId);

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
      const [order] = await tx
        .insert(orders)
        .values({
          ...reqDto,
          code: `DH${Date.now()}`,
          areaId: area.id,
          storeId: reqDto.storeId,
          userId: payload.id,
        })
        .returning();

      // Kiểm tra voucher admin
      if (reqDto.voucherAdminId) {
        // Kiểm tra xem voucher có tồn tại và còn hiệu lực hay không

        if (
          !(await this.vouchersService.ensureVoucherIsActive(
            reqDto.voucherAdminId,
            tx,
          ))
        ) {
          throw new ValidationException(ErrorCode.V001, HttpStatus.BAD_REQUEST);
        }
        await tx.insert(vouchersOnOrders).values({
          orderId: order.id,
          voucherId: reqDto.voucherAdminId,
        });
      }

      // Kiểm tra voucher cửa hàng
      if (reqDto.voucherStoreId) {
        // Kiểm tra xem voucher có tồn tại và còn hiệu lực hay không
        if (
          !(await this.vouchersService.ensureVoucherIsActive(
            reqDto.voucherStoreId,
            tx,
          ))
        ) {
          throw new ValidationException(ErrorCode.V001, HttpStatus.BAD_REQUEST);
        }
        await tx.insert(vouchersOnOrders).values({
          orderId: order.id,
          voucherId: reqDto.voucherStoreId,
        });
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
        SET total_product = GREATEST(odt.total_order_details - COALESCE(tsv.total_store, 0), 0),
            total_voucher = LEAST(odt.total_order_details, COALESCE(tsv.total_store, 0)),
            payfor_shop   = GREATEST(
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
        WITH total_admin_voucher AS (SELECT SUM(v.value) AS total_admin
                                     FROM vouchers_on_orders ov
                                            JOIN vouchers v ON ov.voucher_id = v.id
                                     WHERE ov.order_id = ${order.id}
                                       AND v.type = ${VouchersTypeEnum.ADMIN})
        UPDATE orders
        SET total_delivery = GREATEST(${calculateOrder.totalDelivery} - COALESCE(tav.total_admin, 0), 0),
            total_voucher  = orders.total_voucher + LEAST(${calculateOrder.totalDelivery}, COALESCE(tav.total_admin, 0)),
            income_deliver = GREATEST(${calculateOrder.totalDelivery}::numeric
                                        * (1 - ${serviceFeeWithTypeFood.deliverFeePct}::numeric / 100) -
                                      COALESCE(${serviceFeeWithTypeFood.price}:: numeric, 0), 0)
        FROM total_admin_voucher tav
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
        SET total = COALESCE(total_product + total_delivery + user_service_fee, 0)
        WHERE id = ${order.id};
      `);

      await this.emitter.emitAsync('order.created', order);
      return tx.query.orders.findFirst({
        where: eq(orders.id, order.id),
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

      console.log('orderDetail', orderDetail);
      if (item.extras.length > 0) {
        // Tạo chi tiết đơn hàng cho các extras
        console.log('item.extras', item.extras);
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
      console.log('qua đây nè');

      // tính tổng chi tiết đơn hàng rồi update vào field total

      // lef join table options extras để lấy price

      await tx.execute(sql`
        UPDATE order_details od
        SET total = (
          COALESCE(od.quantity * p.price, 0) +
          COALESCE((SELECT o.price FROM options o WHERE o.id = od.option_id), 0) +
          COALESCE((SELECT SUM(ex.price)
                    FROM extras_to_order_details etod
                           JOIN extras ex ON ex.id = etod.extra_id
                    WHERE etod.order_detail_id = od.id), 0)
          )
        FROM products p
        WHERE od.product_id = p.id
      `);

      console.log('qua đây nè 2');
    }
  }

  async getDetailById(orderId: number) {
    const order = await this.db.query.orders.findFirst({
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
    if (!order) {
      throw new ValidationException(ErrorCode.OD001, HttpStatus.NOT_FOUND);
    }
    return order;
  }

  async getPageByUserId(userId: number, reqDto: PageMyOrderReqDto) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.orders> = {
      with: {
        store: true,
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
    console.log('sssssssssssssssssssssss', reqDto);

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
      entities,
      meta,
      totalOrdersForPaginated,
    );
  }

  async update(orderId: number, reqDto: UpdateStatusOrderReqDto) {
    const existOrder = await this.existById(orderId);
    if (!existOrder) {
      throw new ValidationException(ErrorCode.O001, HttpStatus.NOT_FOUND);
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

    //-----------------------------------------------------
    // Nếu đơn hàng đã bị hủy thì hoàn tiền voucher cho shipper
    //----------------------------------------------------------
    return await this.db.transaction(async (tx) => {
      if (existOrder.deliverId) {
        const deliver = await this.deliversService.findById(
          existOrder.deliverId,
        );
        if (!deliver) {
          throw new ValidationException(ErrorCode.D001, HttpStatus.NOT_FOUND);
        }
      }
      await this.db
        .update(orders)
        .set({
          status: reqDto.status,
        })
        .where(eq(orders.id, orderId))
        .returning();
    });
  }

  async assign(orderId: number, payload: JwtPayloadType) {
    //--------------------------------------------
    // Kiểm tra xem đơn hàng có tồn tại không
    //--------------------------------------------
    const existOrder = await this.findById(orderId);
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
    const subtractPoint =
      existOrder.totalDelivery -
      existOrder.incomeDeliver +
      existOrder.userServiceFee +
      existOrder.storeServiceFee;

    console.log('subtractPoint', subtractPoint);
    console.log('existDeliver.point', existDeliver.point);
    console.log('existOrder.totalDelivery', existOrder.totalDelivery);
    console.log('existOrẻ', existOrder);

    //--------------------------------------------
    // Kiểm tra xem người giao hàng có đủ điểm để nhận đơn không
    //--------------------------------------------
    if (existDeliver.point < subtractPoint) {
      throw new ValidationException(ErrorCode.D006);
    }

    return this.db.transaction(async (tx) => {
      await this.deliversService.subtractPoint(payload.id, subtractPoint, tx);
      const [result] = await tx
        .update(orders)
        .set({
          status: OrderStatusEnum.ACCEPTED,
          deliverId: payload.id,
        })
        .where(eq(orders.id, orderId))
        .returning();

      this.emitter.emit('order.accepted', orderId);
      return result;
    });
  }

  async updateStatusByDeliver(
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
      switch (status) {
        case OrderStatusEnum.CANCELED: {
          //--------------------------------------------
          // Kiểm tra xem lý do hủy đơn hàng có tồn tại không
          //--------------------------------------------
          await this.doCancelOrder(existOrder, existDeliver, reason, tx);
          break;
        }
        case OrderStatusEnum.DELIVERED:
          await this.doCompleteOrder(existOrder, existDeliver, tx);
          break;
        default:
          break;
      }

      await tx
        .update(orders)
        .set({
          status: status,
        })
        .where(eq(orders.id, orderId));

      return existOrder;
    });
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

    // Số điểm sẽ được cộng lại cho người giao hàng
    const subtractPoint =
      existOrder.totalDelivery -
      existOrder.incomeDeliver +
      existOrder.userServiceFee +
      existOrder.storeServiceFee;
    await this.deliversService.addPoint(
      existOrder.deliverId,
      subtractPoint,
      tx,
    );

    await tx
      .update(orders)
      .set({
        status: OrderStatusEnum.CANCELED,
      })
      .where(eq(orders.id, existOrder.id))
      .returning();
  }

  // Thực hiện khi hoàn thành đơn hàng
  private async doCompleteOrder(
    existOrder: Order,
    existDeliver: Deliver,
    tx: Transaction,
  ) {
    // Nếu có voucher thì cộng lại điểm cho người giao hàng
    const voucher = await tx
      .select({
        value: vouchers.value,
      })
      .from(vouchers)
      .innerJoin(vouchersOnOrders, eq(vouchers.id, vouchersOnOrders.voucherId))
      .where(
        and(
          eq(vouchersOnOrders.orderId, existOrder.id),
          eq(vouchers.type, VouchersTypeEnum.ADMIN),
        ),
      )
      .limit(1)
      .then((res) => res[0]);

    if (voucher) {
      await this.deliversService.addPoint(existDeliver.id, voucher.value, tx);
    }
    await tx
      .update(orders)
      .set({
        status: OrderStatusEnum.DELIVERED,
      })
      .where(eq(orders.id, existOrder.id))
      .returning();
  }
}
