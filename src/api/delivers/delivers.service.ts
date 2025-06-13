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
  orders,
  OrderStatusEnum,
  ratings,
  RoleEnum,
  vouchers,
  vouchersOnOrders,
  VouchersTypeEnum,
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
        ...(payload.role === RoleEnum.MANAGEMENT
          ? [eq(delivers.areaId, payload.areaId)]
          : []),
        ...(reqDto.areaId ? [eq(delivers.areaId, reqDto.areaId)] : []),
        ...(reqDto.q
          ? [
              or(
                ilike(delivers.phone, `%${reqDto.q}%`),
                ilike(delivers.fullName, `%${reqDto.q}%`),
              ),
            ]
          : []),
        isNull(delivers.deletedAt),
      ),
      with: {
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
        orderBy: [
          reqDto.order === Order.DESC
            ? desc(delivers.createdAt)
            : asc(delivers.createdAt),
        ],
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(
      entities.map((e) => plainToInstance(DeliverResDto, e)),
      meta,
    );
  }

  private async checkActiveDeliver(deliverId: number) {
    return this.db
      .select({
        id: delivers.id,
      })
      .from(delivers)
      .where(and(eq(delivers.id, deliverId), eq(delivers.activated, true)))
      .then((res) => res[0]);
  }

  async getPendingOrders(payload: JwtPayloadType) {
    if (!(await this.checkStatusActive(payload.id))) {
      return [];
    }
    return this.db.query.orders.findMany({
      where: and(
        eq(orders.status, OrderStatusEnum.PENDING),
        eq(orders.areaId, payload.areaId),
      ),
      orderBy: desc(orders.createdAt),
      limit: 10,
      with: {
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

  async update(
    deliverId: number,
    reqDto: UpdateDeliverReqDto,
    payload: JwtPayloadType,
  ) {
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
      await sharp(image.buffer)
        .rotate()
        .jpeg({ quality: 80 })
        .toFile(fullImagePath);
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
    const startOfDay = DateTime.now().startOf('day').toJSDate();
    const endOfDay = DateTime.now().endOf('day').toJSDate();

    const info = await this.db.query.delivers.findFirst({
      where: eq(delivers.id, deliverId),
    });

    const result = await this.db
      .select({
        totalOrders: count(orders.id).mapWith(Number),
        totalIncome: sum(orders.incomeDeliver).mapWith(Number),
        // cancelOrderCount: count(orders.id)
        //   .filter(eq(orders.status, OrderStatusEnum.CANCELED))
        //   .mapWith(Number),
      })
      .from(orders)
      .where(
        and(
          eq(orders.deliverId, deliverId),
          between(orders.updatedAt, startOfDay, endOfDay),
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

    return {
      ...info,
      rating: rating || 0,
      orderCountInDay: result.totalOrders || 0,
      incomeInDay: result.totalIncome || 0,
      // cancelOrderCount: result.cancelOrderCount || 0,
    };
  }

  async getAcceptedOrders(payload: JwtPayloadType) {
    return this.db.query.orders.findMany({
      where: and(
        eq(orders.deliverId, payload.id),
        notInArray(orders.status, [
          OrderStatusEnum.CANCELED,
          OrderStatusEnum.DELIVERED,
        ]),
      ),
      orderBy: desc(orders.createdAt),
      with: {
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
  }

  private async checkStatusActive(deliverId: number) {
    return this.db
      .select({
        id: delivers.id,
      })
      .from(delivers)
      .where(
        and(
          eq(delivers.id, deliverId),
          eq(delivers.activated, true),
          // isNull(delivers.deletedAt),
        ),
      )
      .then((res) => res[0]);
  }

  async selectFcmTokenByAreaId(areaId: number) {
    return this.db.query.delivers.findMany({
      where: and(
        eq(delivers.areaId, areaId),
        eq(delivers.activated, true),
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
      reqDto.from = DateTime.fromJSDate(reqDto.from).startOf('day').toJSDate();
      reqDto.to = DateTime.fromJSDate(reqDto.to).endOf('day').toJSDate();
    }

    const [results, incomeResult] = await Promise.all([
      this.db
        .select({
          ...getTableColumns(orders),
          subtractPoint: sql`
            ( COALESCE(SUM(${vouchers.value}), 0) -
              (${orders.totalDelivery} - ${orders.incomeDeliver} + ${orders.userServiceFee} + ${orders.storeServiceFee}))
          `.mapWith(Number),
        })
        .from(orders)
        .leftJoin(vouchersOnOrders, eq(orders.id, vouchersOnOrders.orderId))
        .leftJoin(
          vouchers,
          and(
            eq(vouchers.id, vouchersOnOrders.voucherId),
            inArray(vouchers.type, [
              VouchersTypeEnum.MANAGEMENT,
              VouchersTypeEnum.ADMIN,
            ]),
          ),
        )
        .where(
          and(
            eq(orders.deliverId, deliverId),
            inArray(orders.status, [
              OrderStatusEnum.DELIVERED,
              OrderStatusEnum.CANCELED,
            ]),
            ...(reqDto.from && reqDto.to
              ? [between(orders.updatedAt, reqDto.from, reqDto.to)]
              : []),
          ),
        )
        .groupBy(orders.id)
        .orderBy(desc(orders.createdAt)),
      this.db
        .select({ totalIncome: sum(orders.incomeDeliver).mapWith(Number) })
        .from(orders)
        .where(
          and(
            eq(orders.deliverId, deliverId),
            eq(orders.status, OrderStatusEnum.DELIVERED),
            ...(reqDto.from && reqDto.to
              ? [between(orders.updatedAt, reqDto.from, reqDto.to)]
              : []),
          ),
        ),
    ]);

    return {
      orderCount: results.length,
      totalIncome: incomeResult[0]?.totalIncome || 0,
      orders: results,
    };
  }

  async getDeliversByPhoneOrName(input: string, areaId: number) {
    return this.db.query.delivers.findMany({
      where: and(
        isNull(delivers.deletedAt),
        ...(areaId ? [eq(delivers.areaId, areaId)] : []),
        ...(input
          ? [
              or(
                ilike(delivers.phone, `%${input}%`),
                ilike(delivers.fullName, `%${input}%`),
              ),
            ]
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
