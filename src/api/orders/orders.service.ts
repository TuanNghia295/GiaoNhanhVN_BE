import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { DeliversService } from '@/api/delivers/delivers.service';
import { CreateOrderDetailReqDto } from '@/api/order-details/dto/create-order-detail.req.dto';
import { CalculateOrderReqDto } from '@/api/orders/dto/calculate-order.req.dto';
import { CountOrderReqDto } from '@/api/orders/dto/count-order.req.dto';
import { OrderCreateReqDto } from '@/api/orders/dto/order-create.req.dto';
import { OrderResDto } from '@/api/orders/dto/order.res.dto';
import { PageMyOrderReqDto } from '@/api/orders/dto/page-my-order.req.dto';
import { PageOrderReqDto } from '@/api/orders/dto/query-order.req.dto';
import { UpdateStatusOrderReqDto } from '@/api/orders/dto/update-status-order.req.dto';
import { SettingsService } from '@/api/settings/settings.service';
import { StoresService } from '@/api/stores/stores.service';
import { UsersService } from '@/api/users/users.service';
import { VouchersService } from '@/api/vouchers/vouchers.service';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import {
  OrdersOffsetPaginatedResDto,
  TOTAL_ORDERS_FOR_PAGINATED,
} from '@/common/dto/offset-pagination/orders-offset-paginated.res.dto';
import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { decrement, DRIZZLE, increment, Transaction } from '@/database/global';
import {
  Area,
  areas,
  CanceledReasonEnum,
  Deliver,
  delivers,
  deliveryRegions,
  distances,
  extrasToOrderDetails,
  Order,
  orderDetails,
  orders,
  OrderStatusEnum,
  OrderTypeEnum,
  products,
  reasonDeliverCancelOrders,
  RoleEnum,
  serviceFees,
  Setting,
  settings,
  stores,
  TDistance,
  TServiceFee,
  users,
  vouchers,
  vouchersOnOrders,
  VouchersTypeEnum,
} from '@/database/schemas';
import { voucherUsages } from '@/database/schemas/voucher-usage.schema';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { GoongService } from '@/shared/goong.service';
import { calculatePayForShop, roundUp } from '@/utils/calculate.util';
import { buildMulticastMessage } from '@/utils/firebase.util';
import { getOrderNotificationContent } from '@/utils/notification.util';
import { allowedTransitions } from '@/utils/util';
import { calculateVoucherDiscount } from '@/utils/voucher-utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { forwardRef, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import { endOfDay, startOfDay } from 'date-fns';
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  isNotNull,
  lt,
  lte,
  SQL,
  sql,
  sum,
} from 'drizzle-orm';
import admin from 'firebase-admin';
import _ from 'lodash';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { FIREBASE_ADMIN } from '../../firebase/firebase.module';

export interface CalculateResponse {
  sessionId: string;
  distance: number;
  incomeDeliver: number;
  userServiceFee: number;
  totalDelivery: number;
  isRain: boolean;
  isNight: boolean;
  rainFee: number;
  deliveryIncomeTax: number;
  nightFee: number;
  areaId: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly usersService: UsersService,
    private readonly storesService: StoresService,
    private readonly emitter: EventEmitter2,
    private readonly vouchersService: VouchersService,
    private readonly settingsService: SettingsService,
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
        store: {
          with: {
            user: true,
          },
        },
        vouchers: {
          with: {
            voucher: true,
          },
        },
        user: true,
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

    // Date range
    const now = DateTime.now();

    const fromDate = DateTime.fromJSDate(reqDto.from ?? now.toJSDate())
      .setZone('Asia/Ho_Chi_Minh')
      .startOf('day')
      .toJSDate();

    const toDate = DateTime.fromJSDate(reqDto.to ?? now.toJSDate())
      .setZone('Asia/Ho_Chi_Minh')
      .endOf('day')
      .toJSDate();

    const whereClauses: SQL[] = [
      between(orders.createdAt, fromDate, toDate),
      ...(reqDto.q ? [ilike(orders.code, `%${reqDto.q}%`)] : []),
      ...(reqDto.areaId ? [eq(orders.areaId, reqDto.areaId)] : []),
      ...(reqDto.status ? [eq(orders.status, reqDto.status)] : []),
      ...(reqDto.type ? [eq(orders.type, reqDto.type)] : []),
      ...(payload.role === RoleEnum.MANAGEMENT ? [eq(orders.areaId, payload.areaId)] : []),
      ...(payload.role === RoleEnum.STORE
        ? [
            inArray(
              orders.storeId,
              this.db.select({ id: stores.id }).from(stores).where(eq(stores.userId, payload.id)),
            ),
          ]
        : []),
    ];

    const baseWhere = and(...whereClauses);
    baseConfig.where = baseWhere;

    const [entities, [{ totalCount }], statusCounts] = await Promise.all([
      this.db.query.orders.findMany({
        ...baseConfig,
        orderBy: desc(orders.createdAt),
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(orders).where(baseWhere),
      this.db
        .select({ status: orders.status, count: count(orders.id) })
        .from(orders)
        .where(
          and(
            between(orders.createdAt, fromDate, toDate),
            ...(reqDto.q ? [ilike(orders.code, `%${reqDto.q}%`)] : []),
            ...(reqDto.areaId ? [eq(orders.areaId, reqDto.areaId)] : []),
            ...(reqDto.type ? [eq(orders.type, reqDto.type)] : []),
            ...(payload.role === RoleEnum.MANAGEMENT ? [eq(orders.areaId, payload.areaId)] : []),
            ...(payload.role === RoleEnum.STORE
              ? [
                  inArray(
                    orders.storeId,
                    this.db
                      .select({ id: stores.id })
                      .from(stores)
                      .where(eq(stores.userId, payload.id)),
                  ),
                ]
              : []),
          ),
        )
        .groupBy(orders.status),
    ]);

    const totalsOrders = Object.fromEntries(
      statusCounts.map(({ status, count }) => [status, count]),
    );
    const allCount = Object.values(totalsOrders).reduce((sum, val) => sum + val, 0);

    const totalOrdersForPaginated: TOTAL_ORDERS_FOR_PAGINATED = {
      totalOrders: allCount,
      totalOrdersPending: totalsOrders[OrderStatusEnum.PENDING] ?? 0,
      totalOrdersAccepted: totalsOrders[OrderStatusEnum.ACCEPTED] ?? 0,
      totalOrdersDelivering: totalsOrders[OrderStatusEnum.DELIVERING] ?? 0,
      totalOrdersDelivered: totalsOrders[OrderStatusEnum.DELIVERED] ?? 0,
      totalOrdersCancelled: totalsOrders[OrderStatusEnum.CANCELED] ?? 0,
    };

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    // 👉 Clean mapping: flatten vouchers array
    const mappedEntities = entities.map((entity) => ({
      ...entity,
      vouchers: Array.isArray(entity.vouchers) ? entity.vouchers.map((v) => v.voucher) : [],
    }));

    return new OrdersOffsetPaginatedResDto(
      mappedEntities.map((order) => plainToInstance(OrderResDto, order)),
      meta,
      totalOrdersForPaginated,
    );
  }

  async findById(orderId: number) {
    return this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        store: true,
        vouchers: {
          with: {
            voucher: true,
          },
        },
        user: true,
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
    let distance: number = 0;
    const area = await this.findNearestArea(reqDto);
    if (!area) {
      throw new ValidationException(ErrorCode.AR001, HttpStatus.NOT_FOUND);
    }

    //---------------------------------------------------------
    // Kiểm tra setting khu vực đã đóng hay chưa
    //---------------------------------------------------------
    await this.settingsService.checkAreaActive(area.id);

    if (reqDto.origins && reqDto.destinations) {
      const response = await this.goongService.getDistanceMatrix({
        origins: reqDto.origins,
        destinations: reqDto.destinations,
        vehicle: 'bike',
      });
      const rawDistance = response.rows[0].elements[0].distance.value / 1000;
      console.log(
        `Calculated raw distance: ${rawDistance} km for origins: ${reqDto.origins} and destinations: ${reqDto.destinations}`,
      );
      console.log('Math.ceil(rawDistance * 2) / 2:', Math.round(rawDistance * 2) / 2);
      // distance = Math.floor(rawDistance * 2) / 2;
      if (rawDistance < 1) {
        distance = 1;
      } else {
        distance = Math.floor(rawDistance * 2) / 2;
      }
    }

    const setting = await this.db.query.settings.findFirst({
      where: eq(settings.areaId, area.id),
    });
    if (!setting) {
      throw new ValidationException(ErrorCode.ST001, HttpStatus.NOT_FOUND);
    }
    const serviceFeeWithTypeFood = await this.db.query.serviceFees.findFirst({
      where: and(
        eq(serviceFees.settingId, setting.id),
        eq(serviceFees.type, OrderTypeEnum.FOOD), // bất kỳ loại nào
      ),
      with: {
        distance: {
          orderBy: asc(distances.minDistance),
        },
      },
    });
    if (!serviceFeeWithTypeFood) {
      throw new ValidationException(ErrorCode.SF001, HttpStatus.NOT_FOUND);
    }

    let calculationResult: CalculateResponse;
    const isAnotherShop = reqDto.orderType === OrderTypeEnum.ANOTHER_SHOP;

    if (isAnotherShop) {
      calculationResult = await this.handleAnotherShopOrder(
        reqDto,
        setting,
        distance,
        serviceFeeWithTypeFood,
      );
    } else {
      calculationResult = await this.handleRegularOrder(
        reqDto,
        setting,
        distance,
        serviceFeeWithTypeFood,
      );
    }

    // 24h
    await this.cache.set(calculationResult.sessionId, calculationResult, 24 * 60 * 60 * 1000); // in milliseconds with v5!
    return calculationResult;
  }

  async findNearestArea(reqDto: CalculateOrderReqDto) {
    console.log('Finding nearest area for origins:', reqDto);
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);
    let area: Area & {
      distance?: number;
    };

    //------------------------------------------------------------
    // B1 : Nếu tồn tại areaId thì lấy thông tin khu vực đó
    //------------------------------------------------------------
    if (
      reqDto.areaId &&
      [OrderTypeEnum.FOOD, OrderTypeEnum.ANOTHER_SHOP].includes(reqDto.orderType)
    ) {
      area = await this.db.query.areas.findFirst({
        where: eq(areas.id, reqDto.areaId),
      });
    }

    // if (reqDto.parent && reqDto.name) {
    //   // Nếu có parent và name, lấy area theo tên
    //   console.log(`lấy area theo tên`, reqDto.parent + ' - ' + reqDto.name);
    //   area = await this.db.query.areas.findFirst({
    //     where: and(eq(areas.parent, reqDto.parent), eq(areas.name, reqDto.name)),
    //   });
    // }

    //------------------------------------------------------------
    // B2 : Nếu không có areaId thì tìm khu vực gần nhất
    //------------------------------------------------------------
    if (!area) {
      const distanceSql = sql.raw(`
    6371 * acos(
      least(
        greatest(
          cos(radians(${latitude})) *
          cos(radians(CAST(split_part(areas.location, ',', 1) AS double precision))) *
          cos(radians(CAST(split_part(areas.location, ',', 2) AS double precision)) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(CAST(split_part(areas.location, ',', 1) AS double precision))),
          -1
        ),
        1
      )
    )
  `);

      area = await this.db
        .select({
          ...getTableColumns(areas),
          distance: distanceSql.mapWith(Number).as('distance'),
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
    console.log('Nearest area found:', area);
    return area;
  }

  private async handleAnotherShopOrder(
    reqDto: CalculateOrderReqDto,
    setting: Setting,
    distanceRate: number = 0,
    serviceFeeWithTypeFood: TServiceFee,
  ): Promise<CalculateResponse> {
    //--------------------------------------------------------------
    // Tính phí dịch vụ giao hàng
    //--------------------------------------------------------------
    const deliveryRegion = await this.db.query.deliveryRegions.findFirst({
      where: eq(deliveryRegions.id, reqDto.deliveryRegionId),
    });
    const totalDelivery = deliveryRegion.price;

    //----------------------------------------------
    // Thu nhập của người giao hàng
    //----------------------------------------------
    const incomeDeliver = _.round(
      (totalDelivery * (100 - (serviceFeeWithTypeFood?.deliverFeePct ?? 0))) / 100 -
        serviceFeeWithTypeFood?.deliverFee,
    );

    //--------------------------------------------------------------
    //Tính thuế thu nhập cá nhân
    //--------------------------------------------------------------
    const deliveryIncomeTax = _.round(incomeDeliver * 0.015, 3);

    // phí dịch vụ người dùng
    const FIXED_USER_SERVICE_FEE = 2000; // Phí dịch vụ người dùng cố định

    const sessionId = uuidv4();

    return {
      sessionId: sessionId,
      distance: distanceRate,
      nightFee: 0,
      rainFee: 0,
      deliveryIncomeTax,
      incomeDeliver: incomeDeliver,
      userServiceFee: FIXED_USER_SERVICE_FEE,
      totalDelivery: totalDelivery,
      isRain: false,
      isNight: false,
      areaId: setting.areaId,
    };
  }

  private async handleRegularOrder(
    reqDto: CalculateOrderReqDto,
    setting: Setting,
    distanceRate: number,
    serviceFeeWithTypeFood: TServiceFee,
  ) {
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
    //--------------------------------------------------------------
    // Tính phí dịch vụ giao hàng
    //--------------------------------------------------------------
    const distanceFee = await this.calculateDistanceFee(
      distanceRate,
      serviceFeeWithType.distance,
      serviceFeeWithType.distancePct,
    );

    //--------------------------------------------------------------
    // Tính phí dịch vụ môi trường
    //--------------------------------------------------------------
    const { isNight, nightFee, isRain, rainFee } = await this.calculateEnvironmentFee(setting);

    const totalDelivery = _.round(distanceFee + nightFee + rainFee);

    //----------------------------------------------
    // Thu nhập của người giao hàng
    //----------------------------------------------
    const incomeDeliver = Math.max(
      _.round(
        (totalDelivery * (100 - (serviceFeeWithTypeFood?.deliverFeePct ?? 0))) / 100 -
          serviceFeeWithTypeFood?.deliverFee,
      ),
      0,
    );

    //--------------------------------------------------------------
    //Tính thuế thu nhập cá nhân
    //--------------------------------------------------------------
    const deliveryIncomeTax = _.round(incomeDeliver * 0.015, 3);

    //--------------------------------------------------------------
    // phí dịch vụ người dùng
    //--------------------------------------------------------------
    const userServiceFee = _.round(serviceFeeWithType.userServiceFee);

    const sessionId = uuidv4();

    return {
      sessionId: sessionId,
      distance: distanceRate,
      incomeDeliver: incomeDeliver,
      userServiceFee: userServiceFee,
      totalDelivery: distanceFee,
      isRain: isRain,
      deliveryIncomeTax,
      isNight: isNight,
      rainFee: rainFee,
      nightFee: nightFee,
      areaId: setting.areaId,
    };
  }

  //hàm tính khoảng cách phí giao hàng
  async calculateDistanceFee(
    totalDistance: number,
    sortedDistances: TDistance[] = [],
    distancePct: number = 0,
  ) {
    let baseRate = 0;
    const multiplier = 1 + distancePct / 100;

    for (const range of sortedDistances) {
      if (totalDistance <= range.minDistance) break;

      const start = range.minDistance;
      const end = range.maxDistance;
      const rate = range.rate;

      const applicableStart = Math.max(start, 0);
      const applicableEnd = Math.min(end, totalDistance);

      if (applicableEnd <= applicableStart) continue;

      const applicableKm = applicableEnd - applicableStart;
      baseRate += applicableKm * rate * multiplier;
    }

    // ✅ Xử lý phần vượt quá maxDistance cuối cùng
    const lastRange = sortedDistances[sortedDistances.length - 1];
    if (totalDistance > lastRange.maxDistance) {
      const extraKm = totalDistance - lastRange.maxDistance;
      baseRate += extraKm * lastRange.rate * multiplier;
    }

    return _.round(baseRate);
  }

  //hàm tính phí dịch vụ môi tường
  private async calculateEnvironmentFee(setting: Setting): Promise<{
    isNight: boolean;
    isRain: boolean;
    nightFee: number;
    rainFee: number;
  }> {
    const zone = 'Asia/Ho_Chi_Minh';
    const now = DateTime.now().setZone(zone);

    const startNight = DateTime.fromJSDate(setting.startNightTime)
      .setZone(zone)
      .set({ year: now.year, month: now.month, day: now.day });

    let endNight = DateTime.fromJSDate(setting.endNightTime)
      .setZone(zone)
      .set({ year: now.year, month: now.month, day: now.day });

    if (endNight <= startNight) {
      endNight = endNight.plus({ days: 1 });
    }

    const isNight = now >= startNight && now <= endNight;
    console.log('isNight:', isNight);
    console.log('startNight:', setting.isNight);
    const nightFee = setting.isNight && isNight ? setting.nightFee : 0;

    const rainFee = setting.isRain ? setting.rainFee : 0;

    return {
      isNight: setting.isNight && isNight,
      isRain: setting.isRain,
      nightFee: setting.isNight && isNight ? nightFee : 0,
      rainFee: setting.isRain ? rainFee : 0,
    };
  }

  private async applyCoupon(
    orderId: number,
    voucherId: number,
    payload: JwtPayloadType,
    tx: Transaction,
  ) {
    console.log('Applying coupon:', voucherId);
    await tx.insert(vouchersOnOrders).values({ orderId: orderId, voucherId });
    await tx
      .insert(voucherUsages)
      .values({
        userId: payload.id,
        voucherId,
      })
      .onConflictDoUpdate({
        target: [voucherUsages.userId, voucherUsages.voucherId],
        set: {
          usageCount: increment(voucherUsages.usageCount, 1),
        },
      });
  }

  /**
   * Tạo mã đơn hàng duy nhất theo định dạng DH-YYYY-DD-XXXX
   * @returns Mã đơn hàng duy nhất
   */
  private async createUniqueCode(): Promise<string> {
    const now = DateTime.utc(); // luôn nên dùng UTC cho DB

    const monthStart = now.startOf('month'); // 00:00 ngày đầu tháng
    const monthEnd = now.endOf('month'); // 23:59:59.999 ngày cuối tháng

    const year = now.year;
    const month = now.month;

    const [{ totalOrder }] = await this.db
      .select({ totalOrder: count(orders.id) })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, monthStart.toJSDate()),
          lt(orders.createdAt, monthEnd.toJSDate()),
        ),
      );

    return `DH-${year}-${month}-${String((totalOrder ?? 0) + 1).padStart(4, '0')}`;
  }

  async create(payload: JwtPayloadType, reqDto: OrderCreateReqDto) {
    const calculateOrder = await this.cache.get<CalculateResponse>(reqDto.sessionId);
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
      if (!(await this.usersService.existsById(payload.id))) {
        throw new ValidationException(ErrorCode.U001);
      }
      if (reqDto.storeId) {
        await this.storesService.checkStoreActive(reqDto.storeId, tx);
      }
      const [order] = await tx
        .insert(orders)
        .values({
          ...reqDto,
          code: await this.createUniqueCode(),
          areaId: calculateOrder.areaId,
          storeId: reqDto.storeId,
          userId: payload.id,
        })
        .returning();

      // Tạo chi tiết đơn hàng
      if (reqDto.items && reqDto.items.length > 0) {
        await this.createOrderDetails(order.id, reqDto.items, tx);
      }

      const [serviceFeeWithType] = await tx
        .select({
          ...getTableColumns(serviceFees),
        })
        .from(serviceFees)
        .innerJoin(settings, eq(serviceFees.settingId, settings.id))
        .where(and(eq(serviceFees.type, reqDto.type), eq(settings.areaId, order.areaId)));

      const totalProduct = await tx
        .select({
          total: sum(orderDetails.total).mapWith(Number),
        })
        .from(orderDetails)
        .where(eq(orderDetails.orderId, order.id))
        .groupBy(orderDetails.orderId)
        .then((res) => res[0]?.total ?? 0);

      //-------------------------------------------------
      // Kiểm tra voucher app
      //-------------------------------------------------
      if (reqDto.voucherAdminId && reqDto.voucherAdminId > 0) {
        await this.vouchersService.ensureVoucherIsActive(
          totalProduct,
          reqDto.voucherAdminId,
          payload.id,
          tx,
        );
        await this.applyCoupon(order.id, reqDto.voucherAdminId, payload, tx);
      }

      //-------------------------------------------------
      // Kiểm tra voucher của cửa hàng
      //-------------------------------------------------
      if (reqDto.voucherStoreId && reqDto.voucherStoreId > 0) {
        await this.vouchersService.ensureVoucherIsActive(
          totalProduct,
          reqDto.voucherStoreId,
          payload.id,
          tx,
        );
        await this.applyCoupon(order.id, reqDto.voucherStoreId, payload, tx);
      }

      const [voucherStoreRecords, voucherAppRecords] = await Promise.all([
        tx
          .select({
            voucher: vouchers,
          })
          .from(vouchersOnOrders)
          .innerJoin(vouchers, eq(vouchersOnOrders.voucherId, vouchers.id))
          .where(
            and(eq(vouchersOnOrders.orderId, order.id), eq(vouchers.type, VouchersTypeEnum.STORE)),
          ),
        tx
          .select({
            voucher: vouchers,
          })
          .from(vouchersOnOrders)
          .innerJoin(vouchers, eq(vouchersOnOrders.voucherId, vouchers.id))
          .where(
            and(
              eq(vouchersOnOrders.orderId, order.id),
              inArray(vouchers.type, [VouchersTypeEnum.ADMIN, VouchersTypeEnum.MANAGEMENT]),
            ),
          ),
      ]);
      if (this.configService.get('app.nodeEnv', { infer: true }) === Environment.DEVELOPMENT) {
        console.group('📦 Order Details');
        console.log('🛒 Total Product:', totalProduct);
        console.log('🏪 Store Vouchers:', voucherStoreRecords);
        console.log('📱 App Vouchers:', voucherAppRecords);
        console.groupEnd();
      }

      const totalVoucherStore = calculateVoucherDiscount(
        voucherStoreRecords.map((v) => v.voucher),
        totalProduct,
      );

      const totalVoucherApp = calculateVoucherDiscount(
        voucherAppRecords.map((v) => v.voucher),
        calculateOrder.totalDelivery,
      );

      const coinUsed = await this.applyUserCoin(
        payload.id,
        reqDto.isCoin,
        calculateOrder.totalDelivery,
        totalVoucherApp,
      );

      if (coinUsed > 0) {
        await this.db
          .update(users)
          .set({ coin: decrement(users.coin, coinUsed) })
          .where(eq(users.id, payload.id));
      }

      console.group('🏷️ Voucher Totals');
      console.log('🛒 Total Product     :', totalProduct);
      console.log('🏪 Store Voucher     :', totalVoucherStore);
      console.log('📱 App Voucher       :', totalVoucherApp);
      console.groupEnd();

      //-------------------------------------------------
      // Tiền thuế của sản phẩm 1.5%
      //-------------------------------------------------
      const totalProductTax = roundUp(totalProduct * 0.015, 3);

      const storeServiceFee =
        reqDto.type === OrderTypeEnum.FOOD
          ? _.round(
              Math.max(
                totalProduct * ((serviceFeeWithType.pricePct ?? 0) / 100) +
                  (serviceFeeWithType.price ?? 0),
                0,
              ),
            )
          : 0;

      //-------------------------------------------------
      // Tính tiền shipper phải đưa cho shop - chỉ tính đơn đò ăn
      // Thu nhập cửa hàng = tiền sản phẩm - phí dịch vụ cửa hàng - thuế sản phẩm
      //-------------------------------------------------
      // thu lại shop
      const payforShop = calculatePayForShop(
        reqDto.type,
        totalProduct,
        storeServiceFee,
        totalVoucherStore,
        totalProductTax,
      );

      const total = _.round(
        Math.max(
          Math.max(totalProduct - totalVoucherStore, 0) +
            Math.max(calculateOrder.totalDelivery - totalVoucherApp - coinUsed, 0) +
            calculateOrder.userServiceFee + // phí dịch vụ người dùng
            calculateOrder.nightFee + // phí dịch vụ đêm
            calculateOrder.rainFee, // phí dịch vụ mưa
          0,
        ),
      );
      if (this.configService.get('app.nodeEnv', { infer: true }) === Environment.DEVELOPMENT) {
        console.group('💰 Service Fee & Payment Calculation');
        console.log('🏪 storeServiceFee:', storeServiceFee);
        console.log('🛍️ payforShop     :', payforShop);
        console.log('🧾 total          :', total);

        console.groupEnd();
      }
      await tx
        .update(orders)
        .set({
          totalProduct: totalProduct,
          totalVoucher: totalVoucherStore + totalVoucherApp,
          totalVoucherStore: totalVoucherStore,
          totalVoucherApp: totalVoucherApp,
          storeServiceFee: storeServiceFee,
          payforShop: payforShop,
          coinUsed: coinUsed,
          totalDelivery: calculateOrder.totalDelivery,
          incomeDeliver: calculateOrder.incomeDeliver,
          totalProductTax: totalProductTax,
          userServiceFee: calculateOrder.userServiceFee,
          deliveryIncomeTax: calculateOrder.deliveryIncomeTax,
          distance: calculateOrder.distance,
          isRain: calculateOrder.isRain,
          isNight: calculateOrder.isNight,
          rainFee: calculateOrder.rainFee,
          nightFee: calculateOrder.nightFee,
          total: total,
        })
        .where(eq(orders.id, order.id));

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
      await this.cache.del(reqDto.sessionId);
      return plainToInstance(OrderResDto, mappedOrderDetail);
    });
  }

  async applyUserCoin(
    userId: number,
    isCoin: boolean,
    totalDelivery: number,
    totalVoucherApp: number,
  ): Promise<number> {
    if (!isCoin) return 0;

    const user = await this.db
      .select({ coin: users.coin })
      .from(users)
      .where(eq(users.id, userId))
      .then((res) => res[0]);

    if (!user) {
      throw new ValidationException(ErrorCode.U001, HttpStatus.NOT_FOUND);
    }

    return Math.min(user.coin, totalDelivery - totalVoucherApp);
  }

  async createOrderDetails(orderId: number, items: CreateOrderDetailReqDto[], tx: Transaction) {
    for (const item of items) {
      const [product] = await tx
        .select({
          id: products.id,
          startDate: products.startDate,
          endDate: products.endDate,
          quantity: products.quantity,
          salePrice: products.salePrice,
        })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);
      if (!product) {
        throw new ValidationException(ErrorCode.P001, HttpStatus.NOT_FOUND);
      }
      const [orderDetail] = await tx
        .insert(orderDetails)
        .values({
          ...item,
          orderId,
        })
        .returning();

      if (item.extras.length > 0) {
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

      const now = new Date();
      const hasSalePrice = product.salePrice !== null && product.salePrice !== undefined;
      console.log('hasSalePrice:', hasSalePrice);
      const isSalePeriod =
        hasSalePrice &&
        !!product.startDate &&
        !!product.endDate &&
        product.startDate <= now &&
        product.endDate >= now;
      console.log('isSalePeriod:', isSalePeriod);
      console.log('product.salePrice:', product);

      if (isSalePeriod && product.quantity < item.quantity) {
        throw new ValidationException(ErrorCode.P002, HttpStatus.BAD_REQUEST);
      }

      // if (product.salePrice && product.startDate) {
      //   // lấy ra số lượng đơn hàng đã đặt cho sản phẩm này
      //   const orderedDuringSale = await tx
      //     .select({ total: sum(orderDetails.quantity).mapWith(Number) })
      //     .from(orderDetails)
      //     .innerJoin(orders, eq(orderDetails.orderId, orders.id))
      //     .where(
      //       and(
      //         eq(orderDetails.productId, item.productId),
      //         gte(orderDetails.createdAt, product.startDate),
      //         not(eq(orders.status, OrderStatusEnum.CANCELED)),
      //       ),
      //     )
      //     .then((res) => res[0]?.total ?? 0);
      //   console.log('Total product ordered for productId:', item.productId, orderedDuringSale);
      //
      //   totalIfThisOrderIncluded = orderedDuringSale + item.quantity;
      // }

      await tx.execute(sql`
        UPDATE order_details
        SET total = (
          COALESCE(
            order_details.quantity * (
              CASE
                WHEN
                  p.sale_price IS NOT NULL AND
                  p.start_date <= NOW() AND
                  p.end_date >= NOW() AND
                  p.quantity >= order_details.quantity
                  THEN p.sale_price
                ELSE p.price
                END
              ), 0
          ) +
          COALESCE(order_details.quantity * (SELECT o.price
                                             FROM options o
                                             WHERE o.id = order_details.option_id), 0) +
          COALESCE(order_details.quantity * (SELECT SUM(ex.price * etod.quantity)
                                             FROM extras_to_order_details etod
                                                    JOIN extras ex ON ex.id = etod.extra_id
                                             WHERE etod.order_detail_id = order_details.id), 0)
          ) FROM products p
        WHERE order_details.id = ${orderDetail.id}
          AND order_details.product_id = p.id
      `);

      // ✅ Trừ kho nếu đang trong thời gian sale, không cần check đủ hàng
      if (isSalePeriod) {
        await tx
          .update(products)
          .set({
            usedSaleQuantity: increment(products.usedSaleQuantity, item.quantity),
            // quantity: decrement(products.quantity, item.quantity),
            ...(product.quantity - item.quantity <= 0
              ? { salePrice: null, startDate: null, endDate: null }
              : {}),
          })
          .where(eq(products.id, item.productId));
        // cập nhật detail này sale
        await tx
          .update(orderDetails)
          .set({
            isSale: true,
          })
          .where(eq(orderDetails.id, orderDetail.id));
      }
    }
  }

  async getDetailById(orderId: number) {
    const orderDetail = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        store: true,
        user: true,
        deliver: true,
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
    if (!orderDetail) {
      throw new ValidationException(ErrorCode.OD001, HttpStatus.NOT_FOUND);
    }
    // flatten vouchers array
    return {
      ...orderDetail,
      vouchers: Array.isArray(orderDetail.vouchers)
        ? orderDetail.vouchers.map((v) => v.voucher)
        : [],
    };
  }

  async getPageByUserId(userId: number, reqDto: PageMyOrderReqDto) {
    if (reqDto.startDate && reqDto.endDate) {
      reqDto.startDate = DateTime.fromJSDate(reqDto.startDate)
        .setZone('Asia/Ho_Chi_Minh')
        .startOf('day')
        .toJSDate();
      reqDto.endDate = DateTime.fromJSDate(reqDto.endDate)
        .setZone('Asia/Ho_Chi_Minh')
        .endOf('day')
        .toJSDate();
    }
    const baseConfig: FindManyQueryConfig<typeof this.db.query.orders> = {
      with: {
        store: true,
        vouchers: {
          with: {
            voucher: true,
          },
        },
        deliver: true,
        user: true,
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
      ...(reqDto.status ? [eq(orders.status, reqDto.status)] : []),
      ...(reqDto.startDate && reqDto.endDate
        ? [between(orders.createdAt, reqDto.startDate, reqDto.endDate)]
        : []),
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
      vouchers: Array.isArray(entity.vouchers) ? entity.vouchers.map((v) => v.voucher) : [],
    }));
    console.log('Mapped Entities:', mappedEntities);

    const totalsOrders = Object.fromEntries(
      (
        await this.db
          .select({ status: orders.status, count: count(orders.id) })
          .from(orders)
          .where(
            and(
              eq(orders.userId, userId),
              ...(reqDto.status ? [eq(orders.status, reqDto.status)] : []),
              ...(reqDto.startDate && reqDto.endDate
                ? [between(orders.createdAt, reqDto.startDate, reqDto.endDate)]
                : []),
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
    return new OrdersOffsetPaginatedResDto(mappedEntities, meta, totalOrdersForPaginated);
  }

  async updateOrderStatus(
    orderId: number,
    reqDto: UpdateStatusOrderReqDto,
    payload: JwtPayloadType,
  ) {
    return await this.db.transaction(async (tx) => {
      const result = await tx.execute(
        sql`
          SELECT id,
                 status,
                 deliver_id AS "deliverId",
                 total_delivery::DOUBLE PRECISION    AS "totalDelivery",
                 income_deliver::DOUBLE PRECISION    AS "incomeDeliver",
                 user_service_fee::DOUBLE PRECISION  AS "userServiceFee",
                 store_service_fee::DOUBLE PRECISION AS "storeServiceFee",
                 night_fee::DOUBLE PRECISION         AS "nightFee",
                 rain_fee::DOUBLE PRECISION          AS "rainFee"
          FROM orders
          WHERE id = ${orderId}
            FOR
          UPDATE
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

      //-------------------------------------------------
      // láy fcm token  by storeId
      //-------------------------------------------------
      const validStoreFcmToken = await this.storesService.getValidStoreFcmTokenByStoreId(
        existOrder.storeId,
      );
      //-------------------------------------------------
      // Gửi thông báo FCM  cho người dùng về việc hủy đơn hàng
      //-------------------------------------------------
      const validUserFcmToken = await this.usersService.getValidUserFcmTokenById(existOrder.userId);

      switch (reqDto.status) {
        case OrderStatusEnum.CANCELED: {
          await this.managerDoCancelOrder(updatedOrder, tx);
          await this.emitter.emitAsync('order.canceled', {
            updatedOrder: updatedOrder,
            role: payload.role,
          });
          const mergeFcmTokens = [validUserFcmToken?.fcmToken, validStoreFcmToken?.fcmToken].filter(
            (token) => token,
          ); // Lọc các token hợp lệ
          if (mergeFcmTokens.length > 0) {
            this.notifyOrderStatus(
              mergeFcmTokens,
              updatedOrder.status,
              updatedOrder.type,
              updatedOrder.code,
            );
          }
          break;
        }
        default:
          const mergeFcmTokens = [validUserFcmToken?.fcmToken].filter((token) => token); // Lọc các token hợp lệ
          if (mergeFcmTokens.length > 0) {
            this.notifyOrderStatus(
              mergeFcmTokens,
              updatedOrder.status,
              updatedOrder.type,
              updatedOrder.code,
            );
          }
          await this.emitter.emitAsync('order.updated_status', updatedOrder);
      }
      return updatedOrder;
    });
  }

  async assignOrderToShipper(orderId: number, payload: JwtPayloadType) {
    console.log('Assigning order to shipper:', orderId, payload);
    return this.db.transaction(async (tx) => {
      //--------------------------------------------
      // Kiểm tra xem đơn hàng có tồn tại không
      //--------------------------------------------
      // Khóa đơn hàng bằng SELECT FOR UPDATE
      const result = await tx.execute(
        sql`
          SELECT id,
                 status,
                 deliver_id AS "deliverId",
                 total_delivery::DOUBLE PRECISION    AS "totalDelivery",
                 income_deliver::DOUBLE PRECISION    AS "incomeDeliver",
                 user_service_fee::DOUBLE PRECISION  AS "userServiceFee",
                 store_service_fee::DOUBLE PRECISION AS "storeServiceFee",
                 night_fee::DOUBLE PRECISION         AS "nightFee",
                 rain_fee::DOUBLE PRECISION          AS "rainFee",
                 total_product_tax::DOUBLE PRECISION AS "totalProductTax"
          FROM orders
          WHERE id = ${orderId}
            FOR
          UPDATE
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
      const subtractPoint = await this.calculateSubtractPoint(existOrder);
      if (this.configService.get('app.nodeEnv', { infer: true }) === Environment.DEVELOPMENT) {
        console.group('🚚 Delivery Calculation');
        console.log('📦 totalDelivery   :', existOrder.totalDelivery);
        console.log('💸 incomeDeliver   :', existOrder.incomeDeliver || 0);
        console.log('🧾 userServiceFee  :', existOrder.userServiceFee || 0);
        console.log('🏪 storeServiceFee :', existOrder.storeServiceFee || 0);
        console.log('🌙 nightFee       :', existOrder.nightFee || 0);
        console.log('🌧️ rainFee        :', existOrder.rainFee || 0);
        console.log('💰 totalProductTax :', existOrder.totalProductTax || 0);
        console.log('➖ subtractPoint    :', subtractPoint);
        console.log('🎯 currentPoint     :', existDeliver.point);
        console.groupEnd();
      }

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

      const validUserFcmToken = await this.usersService.getValidUserFcmTokenById(
        updateOrder.userId,
      );

      console.log('validUserFcmToken', validUserFcmToken);
      if (validUserFcmToken.fcmToken) {
        console.log('Sending FCM notification to user:', validUserFcmToken.fcmToken);
        await this.notifyAboutAssignOrder([validUserFcmToken.fcmToken], updateOrder.code);
      }
      this.emitter.emit('order.accepted', orderId);
      return updateOrder;
    });
  }

  private async notifyAboutAssignOrder(fcmTokens: string[], code: string) {
    if (fcmTokens.length === 0) {
      return;
    }
    try {
      await this.admin.messaging().sendEachForMulticast(
        buildMulticastMessage({
          tokens: fcmTokens,
          title: 'Đơn hàng đã được nhận',
          body: `Đơn hàng sẽ được giao trong thời gian sớm nhất. Mã đơn hàng: ${code}`,
        }),
      );
    } catch (error) {
      this.logger.error('Error sending FCM notification', error);
    }
  }

  async updateOrderStatusByDeliver(orderId: number, status: OrderStatusEnum, reason: string) {
    //--------------------------------------------
    // Kiểm tra xem đơn hàng có tồn tại không
    //--------------------------------------------
    const existOrder = await this.findById(orderId);
    if (!existOrder) {
      throw new ValidationException(ErrorCode.OD001);
    }

    if (existOrder.status === OrderStatusEnum.PENDING || existOrder.status === status) {
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
    const existDeliver = await this.deliversService.findById(existOrder.deliverId);
    if (!existDeliver) {
      throw new ValidationException(ErrorCode.D001);
    }
    const updatedOrder = await this.db.transaction(async (tx) => {
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: status,
        })
        .where(eq(orders.id, orderId))
        .returning();

      //-------------------------------------------------
      // Gửi thông báo FCM  cho người dùng về việc hủy đơn hàng
      //-------------------------------------------------
      const validUserFcmToken = await this.usersService.getValidUserFcmTokenById(existOrder.userId);
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
          //-------------------------------------------------
          // láy fcm token  by storeId
          //-------------------------------------------------
          const validStoreFcmToken = await this.storesService.getValidStoreFcmTokenByStoreId(
            existOrder.storeId,
          );
          console.log('validUserFcmToken', validUserFcmToken);
          const mergeFcmTokens = [validUserFcmToken?.fcmToken, validStoreFcmToken?.fcmToken].filter(
            (token) => token,
          ); // Lọc các token hợp lệ
          if (mergeFcmTokens.length > 0) {
            this.notifyOrderStatus(
              mergeFcmTokens,
              updatedOrder.status,
              updatedOrder.type,
              updatedOrder.code,
            );
          }
          break;
        }
        case OrderStatusEnum.DELIVERED: {
          await this.doCompleteOrder(updatedOrder, existDeliver, tx);
          const mergeFcmTokens = [validUserFcmToken?.fcmToken].filter((token) => token); // Lọc các token hợp lệ
          if (mergeFcmTokens.length > 0) {
            this.notifyOrderStatus(
              mergeFcmTokens,
              updatedOrder.status,
              updatedOrder.type,
              updatedOrder.code,
            );
          }
          await this.emitter.emitAsync('order.updated_status', updatedOrder);
          break;
        }
        default: {
          const mergeFcmTokens = [validUserFcmToken?.fcmToken].filter((token) => token); // Lọc các token hợp lệ
          if (mergeFcmTokens.length > 0) {
            this.notifyOrderStatus(
              mergeFcmTokens,
              updatedOrder.status,
              updatedOrder.type,
              updatedOrder.code,
            );
          }
          await this.emitter.emitAsync('order.updated_status', updatedOrder);
          break;
        }
      }
      return updatedOrder;
    });

    const MAX_CANCEL_ORDER_PER_DAY = 3;
    const cancelOrderCountInDay = await this.getCancelOrderCountInDay(existDeliver.id);

    if (
      updatedOrder.status === OrderStatusEnum.CANCELED &&
      cancelOrderCountInDay > MAX_CANCEL_ORDER_PER_DAY
    ) {
      await this.lockDeliver(existDeliver.id);
      await this.emitter.emitAsync('deliver.locked', existDeliver);
    }
    const cancelOrderCount = MAX_CANCEL_ORDER_PER_DAY - cancelOrderCountInDay;

    return {
      ...updatedOrder,
      cancelOrderCount: cancelOrderCount,
    };
  }

  private async getCancelOrderCountInDay(deliverId: number): Promise<number> {
    return await this.db
      .select({
        count: count(reasonDeliverCancelOrders.id),
      })
      .from(reasonDeliverCancelOrders)
      .where(
        and(
          eq(reasonDeliverCancelOrders.deliverId, deliverId),
          between(
            reasonDeliverCancelOrders.createdAt,
            startOfDay(new Date()),
            endOfDay(new Date()),
          ),
        ),
      )
      .then((res) => res[0]?.count ?? 0);
  }

  private async calculateSubtractPoint(order: Order, refundPoint: number = 0): Promise<number> {
    const value =
      order.totalDelivery +
      order.nightFee +
      order.rainFee -
      order.incomeDeliver +
      order.userServiceFee +
      order.storeServiceFee +
      order.totalProductTax +
      refundPoint; // Hoàn lại điểm cho người giao hàng

    return _.round(Math.max(value, 0));
  }

  // hoàn lượt sale
  private async refundSale(orderId: number, tx: Transaction) {
    const orderDetail = await tx
      .select()
      .from(orderDetails)
      .where(eq(orderDetails.orderId, orderId));

    for (const detail of orderDetail) {
      if (detail.isSale) {
        // cộng lại số lượng sản phẩm đã bán
        await tx
          .update(products)
          .set({
            quantity: increment(products.quantity, detail.quantity),
          })
          .where(eq(products.id, detail.productId));
      }
    }
  }

  private async managerDoCancelOrder(existOrder: Order, tx: Transaction) {
    // hoàn xu cho người dùng
    if (existOrder.coinUsed > 0) {
      await this.usersService.refundCoin(existOrder.userId, existOrder.coinUsed, tx);
    }
    await this.refundSale(existOrder.id, tx);
    // hoàn lại số lượt giảm giá nếu có
    if (existOrder.deliverId) {
      const existDeliver = await this.deliversService.findById(existOrder.deliverId);
      if (!existDeliver) {
        throw new ValidationException(ErrorCode.D001);
      }
      //-------------------------------------------------
      // Cộng lại điểm cho người giao hàng
      //-------------------------------------------------

      const subtractPoint = await this.calculateSubtractPoint(existOrder);

      // hoàn điểm cho shipper
      await this.deliversService.addPoint(existOrder.deliverId, subtractPoint, tx);
    }
  }

  private notifyOrderStatus(
    tokens: string[],
    status: OrderStatusEnum,
    type: OrderTypeEnum,
    orderCode: string,
  ) {
    if (tokens.length === 0) return;
    const { title, message } = getOrderNotificationContent(status, type, orderCode);
    this.admin
      .messaging()
      .sendEachForMulticast(
        buildMulticastMessage({
          tokens,
          title,
          body: message,
        }),
      )
      .catch((error) => {
        this.logger.error('Error sending FCM notification', error);
      });
  }

  // private notifyOrderCanceled(tokens: string[]) {
  //   if (tokens.length === 0) {
  //     return;
  //   }
  //   this.admin
  //     .messaging()
  //     .sendEachForMulticast(
  //       buildMulticastMessage({
  //         tokens: tokens,
  //         title: 'Đơn hàng đã bị hủy',
  //         body: 'Đơn hàng của bạn đã bị hủy. Vui lòng kiểm tra lại.',
  //       }),
  //     )
  //     .catch((error) => {
  //       this.logger.error('Error sending FCM notification', error);
  //     });
  // }

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

    // const [refund] = await tx
    //   .select({
    //     refundPoint: sql`coalesce
    //       (sum(vouchers.value), 0)`.mapWith(Number),
    //   })
    //   .from(orders)
    //   .leftJoin(vouchersOnOrders, eq(orders.id, vouchersOnOrders.orderId))
    //   .leftJoin(
    //     vouchers,
    //     and(
    //       eq(vouchers.id, vouchersOnOrders.voucherId),
    //       inArray(vouchers.type, [VouchersTypeEnum.ADMIN, VouchersTypeEnum.MANAGEMENT]),
    //     ),
    //   )
    //   .where(eq(orders.id, existOrder.id))
    //   .groupBy(orders.id);
    //---------------------------------------------------
    // Hoàn lại điểm cho người giao hàng
    //---------------------------------------------------
    const subtractPoint = await this.calculateSubtractPoint(existOrder);
    await this.deliversService.addPoint(existOrder.deliverId, subtractPoint, tx);
    //--------------------------------------------------
    // Hoàn xu cho người dùng
    //--------------------------------------------------
    if (existOrder.coinUsed > 0) {
      // không cần check user đã tônt tại vì đã check ở hàm create
      await this.usersService.refundCoin(existOrder.userId, existOrder.coinUsed, tx);
    }
    //--------------------------------------
    // Hoàn lại lượt sale
    //---------------------------------
    await this.refundSale(existOrder.id, tx);

    await tx.insert(reasonDeliverCancelOrders).values({
      orderId: existOrder.id,
      reason: reason,
      type: CanceledReasonEnum.CANCELED,
      deliverId: existDeliver.id,
    });
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
  private async doCompleteOrder(existOrder: Order, existDeliver: Deliver, tx: Transaction) {
    const [refund] = await tx
      .select({
        refundPoint: sql`coalesce
          (sum(vouchers.value), 0)`.mapWith(Number),
      })
      .from(orders)
      .leftJoin(vouchersOnOrders, eq(orders.id, vouchersOnOrders.orderId))
      .leftJoin(
        vouchers,
        and(
          eq(vouchers.id, vouchersOnOrders.voucherId),
          inArray(vouchers.type, [VouchersTypeEnum.ADMIN, VouchersTypeEnum.MANAGEMENT]),
        ),
      )
      .where(eq(orders.id, existOrder.id))
      .groupBy(orders.id);
    if (this.configService.get('app.nodeEnv', { infer: true }) === Environment.DEVELOPMENT) {
      console.group('♻️ Refund Point Issued');
      console.log('🚚 Deliver ID   :', existDeliver.id);
      console.log('💰 Refund Point :', refund.refundPoint);
      console.groupEnd();
    }
    //---------------------------------------------------
    // Hoàn lại điểm cho người giao hàng
    //---------------------------------------------------
    const totalRefundPoint = existOrder.coinUsed + refund.refundPoint;
    await this.deliversService.addPoint(existDeliver.id, totalRefundPoint, tx);
  }

  async getOrdersByDateRange(from: Date, to: Date, areaId?: number) {
    return this.db.query.orders.findMany({
      where: and(
        ...(areaId ? [eq(orders.areaId, areaId)] : []),
        ...(from && to ? [gte(orders.createdAt, from), lte(orders.createdAt, to)] : []),
      ),
      orderBy: desc(orders.createdAt),
      with: {
        user: true,
        deliver: true,
      },
    });
  }

  async countOrdersByStatus(reqDto: CountOrderReqDto, payload: JwtPayloadType) {
    // Date range
    const now = DateTime.now();

    const fromDate = DateTime.fromJSDate(reqDto.from ?? now.toJSDate())
      .setZone('Asia/Ho_Chi_Minh')
      .startOf('day')
      .toJSDate();

    const toDate = DateTime.fromJSDate(reqDto.to ?? now.toJSDate())
      .setZone('Asia/Ho_Chi_Minh')
      .endOf('day')
      .toJSDate();

    const statusCounts = await this.db
      .select({ status: orders.status, count: count(orders.id) })
      .from(orders)
      .where(
        and(
          between(orders.createdAt, fromDate, toDate),
          ...(reqDto.q ? [ilike(orders.code, `%${reqDto.q}%`)] : []),
          ...(reqDto.areaId ? [eq(orders.areaId, reqDto.areaId)] : []),
          ...(reqDto.type ? [eq(orders.type, reqDto.type)] : []),
          ...(payload.role === RoleEnum.MANAGEMENT ? [eq(orders.areaId, payload.areaId)] : []),
          ...(payload.role === RoleEnum.STORE
            ? [
                inArray(
                  orders.storeId,
                  this.db
                    .select({ id: stores.id })
                    .from(stores)
                    .where(eq(stores.userId, payload.id)),
                ),
              ]
            : []),
        ),
      )
      .groupBy(orders.status);

    const totalsOrders = Object.fromEntries(
      statusCounts.map(({ status, count }) => [status, count]),
    );
    const allCount = Object.values(totalsOrders).reduce((sum, val) => sum + val, 0);

    const totalOrdersForPaginated: TOTAL_ORDERS_FOR_PAGINATED = {
      totalOrders: allCount,
      totalOrdersPending: totalsOrders[OrderStatusEnum.PENDING] ?? 0,
      totalOrdersAccepted: totalsOrders[OrderStatusEnum.ACCEPTED] ?? 0,
      totalOrdersDelivering: totalsOrders[OrderStatusEnum.DELIVERING] ?? 0,
      totalOrdersDelivered: totalsOrders[OrderStatusEnum.DELIVERED] ?? 0,
      totalOrdersCancelled: totalsOrders[OrderStatusEnum.CANCELED] ?? 0,
    };

    return totalOrdersForPaginated;
  }
}
