import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { DeliversService } from '@/api/delivers/delivers.service';
import { CreateOrderDetailReqDto } from '@/api/order-details/dto/create-order-detail.req.dto';
import { CalculateOrderReqDto } from '@/api/orders/dto/calculate-order.req.dto';
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
import { DRIZZLE, increment, Transaction } from '@/database/global';
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
  reasonDeliverCancelOrders,
  RoleEnum,
  serviceFees,
  Setting,
  settings,
  stores,
  TDistance,
  TServiceFee,
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
        store: true,
        vouchers: true,
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
    const fromDate = startOfDay(new Date(reqDto.from ?? Date.now()));
    const toDate = endOfDay(new Date(reqDto.to ?? Date.now()));

    const whereClauses: SQL[] = [
      between(orders.createdAt, fromDate, toDate),
      ...(reqDto.q ? [ilike(orders.code, `%${reqDto.q}%`)] : []),
      ...(reqDto.areaId ? [eq(orders.areaId, reqDto.areaId)] : []),
      ...(reqDto.status ? [eq(orders.status, reqDto.status)] : []),
      ...(reqDto.type ? [eq(orders.type, reqDto.type)] : []),
      ...(payload.role === RoleEnum.MANAGEMENT
        ? [eq(orders.areaId, payload.areaId)]
        : []),
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
            ...(payload.role === RoleEnum.MANAGEMENT
              ? [eq(orders.areaId, payload.areaId)]
              : []),
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
    const allCount = Object.values(totalsOrders).reduce(
      (sum, val) => sum + val,
      0,
    );

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
      vouchers: Array.isArray(entity.vouchers)
        ? entity.vouchers.map((v) => v.voucher)
        : [],
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
      distance = Math.ceil(response.rows[0].elements[0].distance.value / 1000);
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
    await this.cache.set(
      calculationResult.sessionId,
      calculationResult,
      24 * 60 * 60 * 1000,
    ); // in milliseconds with v5!
    return calculationResult;
  }

  async findNearestArea(reqDto: CalculateOrderReqDto) {
    const [latitude, longitude] = reqDto.origins.split(',').map(Number);
    let area: Area & {
      distance?: number;
    };

    //------------------------------------------------------------
    // B1 : Nếu tồn tại areaId thì lấy thông tin khu vực đó
    //------------------------------------------------------------
    if (reqDto.areaId) {
      area = await this.db.query.areas.findFirst({
        where: eq(areas.id, reqDto.areaId),
      });
    }

    if (reqDto.parent && reqDto.name) {
      // Nếu có parent và name, lấy area theo tên
      console.log(`lấy area theo tên`, reqDto.parent + ' - ' + reqDto.name);
      area = await this.db.query.areas.findFirst({
        where: and(
          eq(areas.parent, reqDto.parent),
          eq(areas.name, reqDto.name),
        ),
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
      (totalDelivery * (100 - (serviceFeeWithTypeFood?.deliverFeePct ?? 0))) /
        100 -
        serviceFeeWithTypeFood?.deliverFee,
    );

    // phí dịch vụ người dùng
    const FIXED_USER_SERVICE_FEE = 2000; // Phí dịch vụ người dùng cố định

    const sessionId = uuidv4();

    return {
      sessionId: sessionId,
      distance: distanceRate,
      incomeDeliver: incomeDeliver,
      userServiceFee: FIXED_USER_SERVICE_FEE,
      totalDelivery: totalDelivery,
      isRain: setting.isRain,
      isNight: setting.isNight,
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
    const envFee = await this.calculateEnvironmentFee(setting);

    const totalDelivery = _.round(distanceFee + envFee);
    //----------------------------------------------
    // Thu nhập của người giao hàng
    //----------------------------------------------
    const incomeDeliver = _.round(
      (totalDelivery * (100 - (serviceFeeWithTypeFood?.deliverFeePct ?? 0))) /
        100 -
        serviceFeeWithTypeFood?.deliverFee,
    );

    // phí dịch vụ người dùng
    const userServiceFee = _.round(serviceFeeWithType.userServiceFee);

    const sessionId = uuidv4();

    return {
      sessionId: sessionId,
      distance: distanceRate,
      incomeDeliver: incomeDeliver,
      userServiceFee: userServiceFee,
      totalDelivery: totalDelivery,
      isRain: setting.isRain,
      isNight: setting.isNight,
      areaId: setting.areaId,
    };
  }

  //hàm tính khoảng cách phí giao hàng
  private async calculateDistanceFee(
    totalDistance: number,
    distances: TDistance[] = [],
    distancePct: number = 0,
  ) {
    let baseRate = 0;
    const multiplier = 1 + distancePct / 100;

    while (totalDistance > 0) {
      const lastDistance = distances[distances.length - 1];

      if (totalDistance > (lastDistance?.maxDistance ?? 0)) {
        const rate = lastDistance?.rate ?? 0;
        baseRate += rate * multiplier;
        totalDistance -= 1;
      } else {
        const matchedDistance = distances.find(
          (distance) =>
            totalDistance >= distance.minDistance &&
            totalDistance <= distance.maxDistance,
        );
        const rate = matchedDistance?.rate ?? 0;
        baseRate += rate * multiplier;
        totalDistance -= 1;
      }
    }

    return _.round(baseRate); // Làm tròn 2 chữ số thập phân
  }

  //hàm tính phí dịch vụ môi tường
  private async calculateEnvironmentFee(setting: Setting) {
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

    return _.round(nightFee + rainFee);
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
        .where(
          and(
            eq(serviceFees.type, reqDto.type),
            eq(settings.areaId, order.areaId),
          ),
        );

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

      const [totalVoucherStore, totalVoucherApp] = await Promise.all([
        tx
          .select({
            total: sum(vouchers.value).mapWith(Number),
          })
          .from(vouchersOnOrders)
          .innerJoin(vouchers, eq(vouchersOnOrders.voucherId, vouchers.id))
          .where(
            and(
              eq(vouchersOnOrders.orderId, order.id),
              eq(vouchers.type, VouchersTypeEnum.STORE),
            ),
          )
          .then((res) => res[0]?.total ?? 0),
        tx
          .select({
            total: sum(vouchers.value).mapWith(Number),
          })
          .from(vouchersOnOrders)
          .innerJoin(vouchers, eq(vouchersOnOrders.voucherId, vouchers.id))
          .where(
            and(
              eq(vouchersOnOrders.orderId, order.id),
              inArray(vouchers.type, [
                VouchersTypeEnum.ADMIN,
                VouchersTypeEnum.MANAGEMENT,
              ]),
            ),
          )
          .then((res) => res[0]?.total ?? 0),
      ]);

      console.group('🏷️ Voucher Totals');
      console.log('🛒 Total Product     :', totalProduct);
      console.log('🏪 Store Voucher     :', totalVoucherStore);
      console.log('📱 App Voucher       :', totalVoucherApp);
      console.groupEnd();

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
      //-------------------------------------------------
      const payforShop =
        reqDto.type === OrderTypeEnum.FOOD
          ? _.round(
              Math.max(
                totalProduct *
                  ((100 - (serviceFeeWithType.pricePct ?? 0)) / 100) -
                  (serviceFeeWithType.price ?? 0) -
                  totalVoucherStore,
                0,
              ),
            )
          : 0;

      const total = _.round(
        Math.max(
          Math.max(totalProduct - totalVoucherStore, 0) +
            Math.max(calculateOrder.totalDelivery - totalVoucherApp, 0) +
            calculateOrder.userServiceFee,
          0,
        ),
      );
      if (
        this.configService.get('app.nodeEnv', { infer: true }) ===
        Environment.DEVELOPMENT
      ) {
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
          storeServiceFee: storeServiceFee,
          payforShop: payforShop,
          totalDelivery: calculateOrder.totalDelivery,
          incomeDeliver: calculateOrder.incomeDeliver,
          userServiceFee: calculateOrder.userServiceFee,
          distance: calculateOrder.distance,
          isRain: calculateOrder.isRain,
          isNight: calculateOrder.isNight,
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

  async createOrderDetails(
    orderId: number,
    items: CreateOrderDetailReqDto[],
    tx: Transaction,
  ) {
    for (const item of items) {
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

      await tx.execute(sql`
        UPDATE order_details
        SET total = (
          COALESCE(order_details.quantity * p.price, 0) +
          COALESCE(order_details.quantity * (SELECT o.price
                                             FROM options o
                                             WHERE o.id = order_details.option_id), 0) +
          COALESCE(order_details.quantity * (SELECT SUM(ex.price * etod.quantity)
                                             FROM extras_to_order_details etod
                                                    JOIN extras ex ON ex.id = etod.extra_id
                                             WHERE etod.order_detail_id = order_details.id), 0)
          )
        FROM products p
        WHERE order_details.id = ${orderDetail.id}
          AND order_details.product_id = p.id
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
    if (reqDto.startDate && reqDto.endDate) {
      reqDto.startDate = DateTime.fromJSDate(new Date(reqDto.startDate))
        .startOf('day')
        .toJSDate();
      reqDto.endDate = DateTime.fromJSDate(new Date(reqDto.endDate))
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
      vouchers: Array.isArray(entity.vouchers)
        ? entity.vouchers.map((v) => v.voucher)
        : [],
    }));

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
    return new OrdersOffsetPaginatedResDto(
      mappedEntities.map((order) => plainToInstance(OrderResDto, order)),
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
      const subtractPoint = _.round(
        Math.max(
          existOrder.totalDelivery -
            (existOrder.incomeDeliver || 0) +
            (existOrder.userServiceFee || 0) +
            (existOrder.storeServiceFee || 0),
          0,
        ),
      );
      if (
        this.configService.get('app.nodeEnv', { infer: true }) ===
        Environment.DEVELOPMENT
      ) {
        console.group('🚚 Delivery Calculation');
        console.log('📦 totalDelivery   :', existOrder.totalDelivery);
        console.log('💸 incomeDeliver   :', existOrder.incomeDeliver || 0);
        console.log('🧾 userServiceFee  :', existOrder.userServiceFee || 0);
        console.log('🏪 storeServiceFee :', existOrder.storeServiceFee || 0);
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
      const subtractPoint = _.round(
        Math.max(
          existOrder.totalDelivery -
            (existOrder.incomeDeliver || 0) +
            (existOrder.userServiceFee || 0) +
            (existOrder.storeServiceFee || 0),
          0,
        ),
      );

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
          inArray(vouchers.type, [
            VouchersTypeEnum.ADMIN,
            VouchersTypeEnum.MANAGEMENT,
          ]),
        ),
      )
      .where(eq(orders.id, existOrder.id))
      .groupBy(orders.id);
    // Số điểm sẽ được cộng lại cho người giao hàng
    const subtractPoint = _.round(
      Math.max(
        existOrder.totalDelivery -
          (existOrder.incomeDeliver || 0) +
          (existOrder.userServiceFee || 0) +
          (existOrder.storeServiceFee || 0) +
          refund.refundPoint,
        0,
      ),
    );

    // Cộng lại điểm cho người giao hàng
    await this.deliversService.addPoint(
      existOrder.deliverId,
      subtractPoint,
      tx,
    );

    await tx.insert(reasonDeliverCancelOrders).values({
      orderId: existOrder.id,
      reason: reason,
      type: CanceledReasonEnum.CANCELED,
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
        refundPoint: sql`coalesce
          (sum(vouchers.value), 0)`.mapWith(Number),
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
    if (
      this.configService.get('app.nodeEnv', { infer: true }) ===
      Environment.DEVELOPMENT
    ) {
      console.group('♻️ Refund Point Issued');
      console.log('🚚 Deliver ID   :', existDeliver.id);
      console.log('💰 Refund Point :', refund.refundPoint);
      console.groupEnd();
    }
    await this.deliversService.addPoint(
      existDeliver.id,
      refund.refundPoint,
      tx,
    );
  }

  async getOrdersByDateRange(from: Date, to: Date, areaId?: number) {
    return this.db.query.orders.findMany({
      where: and(
        ...(areaId ? [eq(orders.areaId, areaId)] : []),
        ...(from && to
          ? [gte(orders.createdAt, from), lte(orders.createdAt, to)]
          : []),
      ),
      orderBy: desc(orders.createdAt),
      with: {
        user: true,
        deliver: true,
      },
    });
  }
}
