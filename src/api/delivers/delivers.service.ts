import { CreateDeliverReqDto } from '@/api/delivers/dto/create-deliver.req.dto';
import { DeliverResDto } from '@/api/delivers/dto/deliver.res.dto';
import { PageDeliverReqDto } from '@/api/delivers/dto/page-deliver.req.dto';
import { RevenueReqDto } from '@/api/delivers/dto/revenue.req.dto';
import { UpdateDeliverReqDto } from '@/api/delivers/dto/update-deliver.req.dto';
import { OrdersService } from '@/api/orders/orders.service';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Order } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { decrement, DRIZZLE, increment, Transaction } from '@/database/global';
import {
  delivers,
  locations,
  orderDetails,
  orders,
  OrderStatusEnum,
  ratings,
  RoleEnum,
  vouchers,
  vouchersOnOrders,
} from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { normalizeImagePath } from '@/utils/util';
import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import {
  and,
  asc,
  avg,
  between,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
  sum,
} from 'drizzle-orm';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { DateTime } from 'luxon';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';

@Injectable()
export class DeliversService implements OnModuleInit {
  constructor(
    private readonly emitter: EventEmitter2,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  private basePath = 'uploads/delivers/';

  onModuleInit() {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
      console.log(`Đã tạo thư mục upload: ${this.basePath}`);
    }
  }

  async getPageDelivers(reqDto: PageDeliverReqDto, payload: JwtPayloadType) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.delivers> = {
      where: and(
        ...(payload.role === RoleEnum.MANAGEMENT ? [eq(delivers.areaId, payload.areaId)] : []),
        ...(reqDto.areaId ? [eq(delivers.areaId, reqDto.areaId)] : []),
        ...(reqDto.q
          ? [or(ilike(delivers.phone, `%${reqDto.q}%`), ilike(delivers.fullName, `%${reqDto.q}%`))]
          : []),
        isNull(delivers.deletedAt),
      ),
      with: {
        area: true,
        location: true,
      },
    };

    const qCount = this.db.query.delivers.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.delivers.findMany({
        ...baseConfig,
        orderBy: [reqDto.order === Order.DESC ? desc(delivers.createdAt) : asc(delivers.createdAt)],
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    const newEntities = entities.map((item) => plainToInstance(DeliverResDto, item));
    return new OffsetPaginatedDto(newEntities, meta);
  }

  async getPendingOrders(payload: JwtPayloadType) {
    if (!(await this.checkStatusActive(payload.id))) {
      return [];
    }
    const ordersList = await this.db.query.orders.findMany({
      where: and(eq(orders.status, OrderStatusEnum.PENDING), eq(orders.areaId, payload.areaId)),
      orderBy: asc(orders.createdAt),
      with: {
        deliveryRegion: true,
        user: true,
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

    // ✅ OPTIMIZED: Fetch all user purchases at once
    const userPurchasesMap = await this.fetchUserPurchasesForOrders(ordersList);

    // Check xem user có còn được mua flash sale không
    // Logic:
    // - limitedFlashSaleQuantity = 0: Không có flash sale → canOrderMoreFlashSale = false
    // - limitedFlashSaleQuantity > 0: Có flash sale → check startDate, endDate và số lượng đã mua
    return ordersList.map((order) => {
      let canOrderMoreFlashSale = true;

      // Check tất cả sản phẩm trong đơn hàng có phải là flash sale product không
      if (order.orderDetails && order.userId) {
        for (const detail of order.orderDetails) {
          const limitedQty = Number(detail.product?.limitedFlashSaleQuantity) || 0;
          const now = new Date();
          const startDate = detail.product?.startDate ? new Date(detail.product.startDate) : null;
          const endDate = detail.product?.endDate ? new Date(detail.product.endDate) : null;

          // Check flash sale còn hiệu lực không
          const isFlashSaleActive = Boolean(
            startDate && endDate && now >= startDate && now <= endDate && limitedQty > 0,
          );

          // limitedQty = 0 hoặc flash sale hết hạn → set false và break
          if (!isFlashSaleActive) {
            canOrderMoreFlashSale = false;
            break;
          }

          // ✅ OPTIMIZED: Lookup from Map instead of querying DB
          const purchaseKey = `${order.userId}-${detail.productId}`;
          const userPurchased = userPurchasesMap.get(purchaseKey) || 0;

          // Nếu user đã mua đủ giới hạn bất kỳ sản phẩm flash sale nào
          if (userPurchased >= limitedQty) {
            canOrderMoreFlashSale = false;
            break;
          }
        }
      }

      return {
        ...order,
        canOrderMoreFlashSale,
      };
    });
  }

  async findById(deliverId: number) {
    return this.db
      .select()
      .from(delivers)
      .where(eq(delivers.id, deliverId))
      .then((res) => res[0]);
  }

  async existById(deliverId: number) {
    return this.db
      .select({
        id: delivers.id,
        phone: delivers.phone,
        point: delivers.point,
        avatar: delivers.avatar,
        areaId: delivers.areaId,
      })
      .from(delivers)
      .where(eq(delivers.id, deliverId))
      .then((res) => res[0]);
  }

  async addPoint(deliverId: number, point: number, tx: Transaction) {
    return tx
      .update(delivers)
      .set({
        point: increment(delivers.point, point),
      })
      .where(eq(delivers.id, deliverId));
  }

  async subtractPoint(deliverId: number, point: number, tx: Transaction) {
    return tx
      .update(delivers)
      .set({
        point: decrement(delivers.point, point),
      })
      .where(eq(delivers.id, deliverId));
  }

  async getDetail(deliverId: number) {
    const result = await this.db.query.delivers.findFirst({
      where: eq(delivers.id, deliverId),
      with: {
        location: true,
      },
    });
    if (!result) {
      throw new ValidationException(ErrorCode.D001);
    }
    return plainToInstance(DeliverResDto, result);
  }

  async update(deliverId: number, reqDto: UpdateDeliverReqDto, _payload: JwtPayloadType) {
    return this.db.transaction(async (tx) => {
      if (reqDto.location) {
        await tx
          .insert(locations)
          .values({
            ...reqDto.location,
            deliverId,
          })
          .onConflictDoUpdate({
            target: [locations.deliverId],
            set: {
              ...reqDto.location,
            },
          });
      }

      //--------------------------------------
      // Trường hợp này là do khi cập nhạt fe truyền point = 0
      //---------------------------------------
      if (reqDto.point === 0) {
        delete reqDto.point;
      }

      const [result] = await tx
        .update(delivers)
        .set({
          ...reqDto,
        })
        .where(eq(delivers.id, deliverId))
        .returning();

      //----------------------------------------------------------
      // Nếu status = false thì gửi event
      if (!result.status) {
        await this.emitter.emitAsync('deliver.locked', result);
      }
      return plainToInstance(DeliverResDto, result);
    });
  }

  async softDelete(deliverId: number) {
    return this.db
      .update(delivers)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(delivers.id, deliverId));
  }

  async existByPhone(phone: string) {
    return this.db
      .select({
        id: delivers.id,
      })
      .from(delivers)
      .where(and(eq(delivers.phone, phone), isNull(delivers.deletedAt)))
      .then((res) => res[0]);
  }

  async create(reqDto: CreateDeliverReqDto) {
    if (await this.existByPhone(reqDto.phone)) {
      throw new ValidationException(ErrorCode.D007);
    }
    return await this.db.transaction(async (tx) => {
      const [result] = await tx
        .insert(delivers)
        .values({
          ...reqDto,
        })
        .returning();

      return plainToInstance(DeliverResDto, result);
    });
  }

  private async buildFileName(prefix: string): Promise<string> {
    const uniqueId = uuidv4();
    return `${prefix}_${uniqueId}.jpeg`;
  }

  async updateImage(deliverId: number, image: Express.Multer.File) {
    const existDeliver = await this.existById(deliverId);
    if (!existDeliver) {
      throw new ValidationException(ErrorCode.D001);
    }
    const imageName = existDeliver.avatar?.replace(/^.*[\\/]/, '');
    if (imageName) {
      const imagePath = join(this.basePath, imageName);
      if (existsSync(imagePath)) {
        unlinkSync(imagePath);
      }
    }

    let normalizedPath: string = existDeliver.avatar; // Keep old image if new one isn't provided
    if (image?.buffer) {
      const fileName = await this.buildFileName('banner');
      const fullImagePath = join(this.basePath, fileName);
      await sharp(image.buffer).rotate().jpeg({ quality: 80 }).toFile(fullImagePath);
      normalizedPath = normalizeImagePath(fullImagePath);
    }

    return this.db
      .update(delivers)
      .set({
        avatar: normalizedPath,
      })
      .where(eq(delivers.id, deliverId))
      .returning()
      .then((res) => res[0]);
  }

  async getInfoById(deliverId: number) {
    const startOfDay = DateTime.now().setZone('Asia/Ho_Chi_Minh').startOf('day').toJSDate();
    const endOfDay = DateTime.now().setZone('Asia/Ho_Chi_Minh').endOf('day').toJSDate();
    console.log('startOfDay', startOfDay);
    console.log('endOfDay', endOfDay);

    const info = await this.db.query.delivers.findFirst({
      where: and(eq(delivers.id, deliverId), isNull(delivers.deletedAt)),
      with: {
        location: true,
      },
    });
    if (!info) {
      throw new ValidationException(ErrorCode.D001);
    }

    const result = await this.db
      .select({
        totalOrders: count(orders.id).mapWith(Number),
        totalIncome: sum(orders.incomeDeliver).mapWith(Number),
      })
      .from(orders)
      .where(
        and(
          eq(orders.deliverId, deliverId),
          between(orders.createdAt, startOfDay, endOfDay),
          eq(orders.status, OrderStatusEnum.DELIVERED),
        ),
      )
      .then((res) => res[0]);

    // lấy ra rating
    const rating = await this.db
      .select({
        rating: avg(ratings.deliverRate).mapWith(String),
      })
      .from(ratings)
      .where(eq(ratings.deliverId, deliverId))
      .then((res) => res[0]?.rating || 0);

    console.log('info', info);
    return {
      ...info,
      rating: rating || 0,
      orderCountInDay: result.totalOrders || 0,
      incomeInDay: result.totalIncome || 0,
      // cancelOrderCount: result.cancelOrderCount || 0,
    };
  }

  async getAcceptedOrders(payload: JwtPayloadType) {
    const ordersList = await this.db.query.orders.findMany({
      where: and(
        eq(orders.deliverId, payload.id),
        notInArray(orders.status, [OrderStatusEnum.CANCELED, OrderStatusEnum.DELIVERED]),
      ),
      orderBy: desc(orders.createdAt),
      with: {
        deliveryRegion: true,
        user: true,
        store: {
          with: {
            user: true,
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

    // ✅ OPTIMIZED: Fetch all user purchases at once
    const userPurchasesMap = await this.fetchUserPurchasesForOrders(ordersList);

    // Check xem user có còn được mua flash sale không
    // Logic:
    // - limitedFlashSaleQuantity = 0: Không có flash sale → canOrderMoreFlashSale = false
    // - limitedFlashSaleQuantity > 0: Có flash sale → check startDate, endDate và số lượng đã mua
    return ordersList.map((order) => {
      let canOrderMoreFlashSale = true;

      // Check tất cả sản phẩm trong đơn hàng có phải là flash sale product không
      if (order.orderDetails && order.userId) {
        for (const detail of order.orderDetails) {
          const limitedQty = Number(detail.product?.limitedFlashSaleQuantity) || 0;
          const now = new Date();
          const startDate = detail.product?.startDate ? new Date(detail.product.startDate) : null;
          const endDate = detail.product?.endDate ? new Date(detail.product.endDate) : null;

          // Check flash sale còn hiệu lực không
          const isFlashSaleActive = Boolean(
            startDate && endDate && now >= startDate && now <= endDate && limitedQty > 0,
          );

          // limitedQty = 0 hoặc flash sale hết hạn → set false và break
          if (!isFlashSaleActive) {
            canOrderMoreFlashSale = false;
            break;
          }

          // ✅ OPTIMIZED: Lookup from Map instead of querying DB
          const purchaseKey = `${order.userId}-${detail.productId}`;
          const userPurchased = userPurchasesMap.get(purchaseKey) || 0;

          // Nếu user đã mua đủ giới hạn bất kỳ sản phẩm flash sale nào
          if (userPurchased >= limitedQty) {
            canOrderMoreFlashSale = false;
            break;
          }
        }
      }

      return {
        ...order,
        canOrderMoreFlashSale,
      };
    });
  }

  private async checkStatusActive(deliverId: number) {
    return this.db
      .select({
        id: delivers.id,
      })
      .from(delivers)
      .where(
        and(eq(delivers.id, deliverId), eq(delivers.activated, true), isNull(delivers.deletedAt)),
      )
      .then((res) => res[0]);
  }

  /**
   * ✅ OPTIMIZED: Fetch all user purchases for multiple orders in a single query
   * This eliminates N+1 query problem by batching all user-product purchase lookups
   *
   * @param ordersList - List of orders with orderDetails
   * @returns Map<string, number> where key is "userId-productId" and value is total quantity purchased
   */
  private async fetchUserPurchasesForOrders(
    ordersList: Array<{
      userId?: number;
      orderDetails?: Array<{ productId?: number }>;
    }>,
  ): Promise<Map<string, number>> {
    // Early return if no orders
    if (!ordersList || ordersList.length === 0) {
      return new Map();
    }

    // Collect all unique user-product pairs
    const userProductPairs = new Set<string>();
    const userIds = new Set<number>();
    const productIds = new Set<number>();

    for (const order of ordersList) {
      if (order.userId && order.orderDetails) {
        for (const detail of order.orderDetails) {
          if (detail.productId) {
            userProductPairs.add(`${order.userId}-${detail.productId}`);
            userIds.add(order.userId);
            productIds.add(detail.productId);
          }
        }
      }
    }

    // Early return if no valid pairs
    if (userProductPairs.size === 0) {
      return new Map();
    }

    // Query all purchases in a single DB call
    const purchases = await this.db
      .select({
        userId: orderDetails.userId,
        productId: orderDetails.productId,
        totalQuantity: sql<number>`COALESCE(SUM(${orderDetails.quantity}), 0)`.as('totalQuantity'),
      })
      .from(orderDetails)
      .where(
        and(
          inArray(orderDetails.userId, Array.from(userIds)),
          inArray(orderDetails.productId, Array.from(productIds)),
          eq(orderDetails.isSale, true),
        ),
      )
      .groupBy(orderDetails.userId, orderDetails.productId);

    // Build Map for O(1) lookup
    const purchasesMap = new Map<string, number>();
    for (const purchase of purchases) {
      if (purchase.userId && purchase.productId) {
        const key = `${purchase.userId}-${purchase.productId}`;
        purchasesMap.set(key, Number(purchase.totalQuantity) || 0);
      }
    }

    return purchasesMap;
  }

  async selectFcmTokenByAreaId(areaId: number) {
    return this.db.query.delivers.findMany({
      where: and(
        eq(delivers.areaId, areaId),
        eq(delivers.activated, true),
        eq(delivers.status, true),
        isNull(delivers.deletedAt),
      ),
      columns: {
        id: true,
        fcmToken: true,
      },
      orderBy: desc(delivers.createdAt),
    });
  }

  async getRevenue(deliverId: number, reqDto: RevenueReqDto) {
    if (reqDto.to && reqDto.from) {
      reqDto.from = DateTime.fromJSDate(reqDto.from)
        .setZone('Asia/Ho_Chi_Minh')
        .startOf('day')
        .toJSDate();
      reqDto.to = DateTime.fromJSDate(reqDto.to)
        .setZone('Asia/Ho_Chi_Minh')
        .endOf('day')
        .toJSDate();
    }

    console.log('reqDto', reqDto);
    const voucherSums = this.db
      .select({
        orderId: vouchersOnOrders.orderId,
        total_voucher_value: sql
          .raw(
            `
                SUM(
                  CASE 
                  WHEN vouchers.type IN ('MANAGEMENT', 'ADMIN')
                    AND vouchers_on_orders.order_id IS NOT NULL 
                    THEN vouchers.value
                    ELSE 0 
                  END
                )
              `,
          )
          .mapWith(Number)
          .as('total_voucher_value'),
      })
      .from(vouchersOnOrders)
      .leftJoin(vouchers, eq(vouchersOnOrders.voucherId, vouchers.id))
      .groupBy(vouchersOnOrders.orderId)
      .as('voucher_sums');

    const [results, incomeResult] = await Promise.all([
      this.db
        .select({
          ...getTableColumns(orders),
          subtractPoint: sql`
            CASE
            WHEN
            ${orders.status}
            =
            ${OrderStatusEnum.CANCELED}
            THEN
            0
            ELSE
            (
            COALESCE
            (
            MAX
            (
            ${voucherSums.total_voucher_value}
            ),
            0
            )
            -
            (
            ${orders.totalDelivery}
            +
            ${orders.rainFee}
            +
            ${orders.nightFee}
            -
            ${orders.incomeDeliver}
            +
            ${orders.userServiceFee}
            +
            ${orders.storeServiceFee}
            +
            ${orders.totalProductTax}
            )
            )
            END
          `.mapWith(Number),
        })
        .from(orders)
        .leftJoin(voucherSums, eq(orders.id, voucherSums.orderId))
        .where(
          and(
            eq(orders.deliverId, deliverId),
            inArray(orders.status, [OrderStatusEnum.DELIVERED, OrderStatusEnum.CANCELED]),
            ...(reqDto.from && reqDto.to
              ? [between(orders.createdAt, reqDto.from, reqDto.to)]
              : []),
          ),
        )
        .groupBy(orders.id)
        .orderBy(desc(orders.createdAt)),
      this.db
        .select({
          //Tổng thu nhập của deliver
          totalIncome: sum(orders.incomeDeliver).mapWith(Number),
          //Tổng thuế của đơn hàng
          totalTax: sum(orders.deliveryIncomeTax).mapWith(Number),
          // Thực lãnh
          totalRealIncome: sum(sql`${orders.incomeDeliver}
          -
          ${orders.deliveryIncomeTax}`).mapWith(Number),
        })
        .from(orders)
        .where(
          and(
            eq(orders.deliverId, deliverId),
            eq(orders.status, OrderStatusEnum.DELIVERED),
            ...(reqDto.from && reqDto.to
              ? [between(orders.createdAt, reqDto.from, reqDto.to)]
              : []),
          ),
        ),
    ]);

    return {
      orderCount: results.length,
      totalIncome: incomeResult[0]?.totalIncome || 0,
      //Tổng thuế
      totalTax: incomeResult[0]?.totalTax || 0,
      //Thực lãnh
      totalRealIncome: incomeResult[0]?.totalRealIncome || 0,
      orders: results,
    };
  }

  async getDeliversByPhoneOrName(input: string, areaId: number, payload: JwtPayloadType) {
    return this.db.query.delivers.findMany({
      where: and(
        isNull(delivers.deletedAt),
        ...(areaId ? [eq(delivers.areaId, areaId)] : []),
        ...(payload.role === RoleEnum.MANAGEMENT ? [eq(delivers.areaId, payload.areaId)] : []),
        ...(input
          ? [or(ilike(delivers.phone, `%${input}%`), ilike(delivers.fullName, `%${input}%`))]
          : []),
      ),
      limit: 20,
      orderBy: desc(delivers.createdAt),
    });
  }

  async logout(id: number) {
    return this.db
      .update(delivers)
      .set({
        fcmToken: null,
        refreshToken: null,
      })
      .where(eq(delivers.id, id))
      .returning()
      .then((res) => res[0]);
  }
}
