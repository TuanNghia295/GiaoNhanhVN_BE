import { AreasService } from '@/api/areas/areas.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateVoucherReqDto } from '@/api/vouchers/dto/create-voucher.req.dto';
import { PageVouchersReqDto } from '@/api/vouchers/dto/page-vouchers-req.dto';
import { UpdateVoucherReqDto } from '@/api/vouchers/dto/update-voucher.req.dto';
import { UsableVoucherReqDto } from '@/api/vouchers/dto/usable-voucher.req.dto';
import { VoucherResDto } from '@/api/vouchers/dto/voucher.res.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { AllConfigType } from '@/config/config.type';
import { Environment, Order } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, Transaction, withPagination } from '@/database/global';
import {
  areas,
  orders,
  RoleEnum,
  stores,
  users,
  vouchers,
  vouchersOnOrders,
  VouchersStatusEnum,
  VouchersTypeEnum,
} from '@/database/schemas';
import { voucherUsages } from '@/database/schemas/voucher-usage.schema'; // Import Lodash
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import {
  ForbiddenException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  or,
  SQL,
  sql,
} from 'drizzle-orm';
import _, { round } from 'lodash';
import { DateTime } from 'luxon';

@Injectable()
export class VouchersService {
  constructor(
    private readonly areasService: AreasService,
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  private readonly logger = new Logger(VouchersService.name);

  async getPageVouchers(reqDto: PageVouchersReqDto, payload: JwtPayloadType) {
    const qb = this.db
      .select({
        ...getTableColumns(vouchers),
        // điếm số lượng voucher đã sử dụng
        usedCount: count(vouchersOnOrders.voucherId),
        user: users,
        area: areas,
      })
      .from(vouchers)
      .leftJoin(vouchersOnOrders, eq(vouchersOnOrders.voucherId, vouchers.id))
      .leftJoin(areas, eq(areas.id, vouchers.areaId))
      .leftJoin(orders, eq(orders.id, vouchersOnOrders.orderId))
      .leftJoin(users, eq(users.id, vouchers.userId))
      .leftJoin(stores, eq(stores.userId, users.id))
      .groupBy(vouchers.id, users.id, areas.id)
      .orderBy(
        reqDto.order === Order.DESC
          ? desc(vouchers.createdAt)
          : asc(vouchers.createdAt),
      )
      .$dynamic();

    let whereClause: SQL;

    switch (payload.role) {
      case RoleEnum.ADMIN:
        whereClause = and(
          isNull(vouchers.deletedAt),
          ...(reqDto.q ? [ilike(vouchers.code, `%${reqDto.q}%`)] : []),
          ...(reqDto.storeInput
            ? [
                or(
                  ilike(stores.name, `%${reqDto.storeInput}%`),
                  ilike(users.phone, `%${reqDto.storeInput}%`),
                ),
              ]
            : []),
          ...(reqDto.isApp
            ? [
                inArray(vouchers.type, [
                  VouchersTypeEnum.ADMIN,
                  VouchersTypeEnum.MANAGEMENT,
                ]),
              ]
            : [eq(vouchers.type, VouchersTypeEnum.STORE)]),
          ...(reqDto.areaId ? [eq(vouchers.areaId, reqDto.areaId)] : []),
        );
        break;
      case RoleEnum.MANAGEMENT:
        whereClause = and(
          isNull(vouchers.deletedAt),
          ...(reqDto.q ? [ilike(vouchers.code, `%${reqDto.q}%`)] : []),
          ...(reqDto.storeInput
            ? [
                or(
                  ilike(stores.name, `%${reqDto.storeInput}%`),
                  ilike(users.phone, `%${reqDto.storeInput}%`),
                ),
              ]
            : []),
          ...(reqDto.isApp
            ? [inArray(vouchers.type, [VouchersTypeEnum.MANAGEMENT])]
            : [eq(vouchers.type, VouchersTypeEnum.STORE)]),
          eq(vouchers.areaId, payload.areaId),
        );
        break;
      case RoleEnum.STORE:
        whereClause = and(
          isNull(vouchers.deletedAt),
          eq(vouchers.userId, payload.id),
          ...(reqDto.q ? [ilike(vouchers.code, `%${reqDto.q}%`)] : []),
        );
        break;
      default:
        throw new ForbiddenException(
          'You do not have permission to access this resource.',
        );
    }

    await withPagination(qb, reqDto.limit, reqDto.offset);
    const [entities, { totalCount }] = await Promise.all([
      qb
        .where(whereClause)
        .orderBy(
          sql.raw("CASE WHEN vouchers.status = 'ACTIVE' THEN 0 ELSE 1 END"),
          desc(vouchers.createdAt),
        ),
      this.db
        .select({
          totalCount: count(),
        })
        .from(vouchers)
        .leftJoin(users, eq(users.id, vouchers.userId))
        .leftJoin(stores, eq(stores.userId, users.id))
        .where(whereClause)
        .execute()
        .then((res) => res[0]),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entities, meta);
  }

  async existByCode(
    code: string,
    userOrManagerId: number,
  ): Promise<{
    voucherId: number;
  }> {
    return this.db
      .select({
        voucherId: vouchers.id,
      })
      .from(vouchers)
      .where(
        and(
          isNull(vouchers.deletedAt),
          eq(vouchers.code, code),
          or(
            eq(vouchers.userId, userOrManagerId),
            eq(vouchers.managerId, userOrManagerId),
          ),
        ),
      )
      .limit(1)
      .then((res) => res[0]);
  }

  async create(reqDto: CreateVoucherReqDto, payload: JwtPayloadType) {
    console.log('reqDto', reqDto);
    //-------------------------------------------------------
    // Kiểm tra mã đó có đang tồn tại
    if (await this.existByCode(reqDto.code, payload.id)) {
      throw new ValidationException(ErrorCode.V002, HttpStatus.BAD_REQUEST);
    }
    if (reqDto.minOrderValue && reqDto.maxOrderValue) {
      throw new ValidationException(ErrorCode.V007, HttpStatus.BAD_REQUEST);
    }

    if (reqDto.startDate && reqDto.endDate) {
      reqDto.startDate = DateTime.fromJSDate(reqDto.startDate)
        .startOf('day')
        .toJSDate();
      reqDto.endDate = DateTime.fromJSDate(reqDto.endDate)
        .endOf('day')
        .toJSDate();
      if (reqDto.startDate >= reqDto.endDate) {
        throw new ValidationException(
          ErrorCode.V009,
          HttpStatus.BAD_REQUEST,
          'Start date must be before end date',
        );
      }
    }

    // Chỉ có role MANAGEMENT với có điểm
    if ([RoleEnum.MANAGEMENT].includes(payload.role)) {
      const area = await this.db
        .select({
          areaId: areas.id,
          point: areas.point,
        })
        .from(areas)
        .where(eq(areas.id, reqDto.areaId))
        .then((res) => res[0]);
      if (!area) {
        throw new ValidationException(ErrorCode.AR001, HttpStatus.BAD_REQUEST);
      }
      if (area.point < reqDto.maxUses * reqDto.value) {
        throw new ValidationException(ErrorCode.TR002, HttpStatus.BAD_REQUEST);
      }

      await this.db
        .update(areas)
        .set({
          point: sql`${areas.point} -
          ${reqDto.maxUses * reqDto.value}`,
        })
        .where(eq(areas.id, reqDto.areaId));
    }

    const now = new Date();
    const status = _.cond([
      [
        (d: CreateVoucherReqDto) => d.startDate && d.startDate > now,
        () => VouchersStatusEnum.PENDING,
      ],
      [
        (d: CreateVoucherReqDto) => d.endDate && d.endDate < now,
        () => VouchersStatusEnum.EXPIRED,
      ],
      [_.stubTrue, () => VouchersStatusEnum.ACTIVE], // Trường hợp mặc định
    ])(reqDto);

    switch (payload.role) {
      case RoleEnum.ADMIN:
        return this.db
          .insert(vouchers)
          .values({
            ...reqDto,
            status, // Trạng thái voucher tự động được xác định dựa trên ngày bắt đầu và ngày kết thúc
            ...(reqDto.isHidden ? { isHidden: true } : {}),
            managerId: payload.id,
            type: VouchersTypeEnum.ADMIN,
            areaId: reqDto.areaId,
          })
          .returning()
          .then((res) => {
            return plainToInstance(VoucherResDto, res[0]);
          });
      case RoleEnum.MANAGEMENT:
        return this.db
          .insert(vouchers)
          .values({
            ...reqDto,
            status, // Trạng thái voucher tự động được xác định dựa trên ngày bắt đầu và ngày kết thúc
            ...(reqDto.isHidden ? { isHidden: true } : {}),
            managerId: payload.id,
            type: VouchersTypeEnum.MANAGEMENT,
            areaId: payload.areaId,
          })
          .returning()
          .then((res) => {
            return plainToInstance(VoucherResDto, res[0]);
          });
      case RoleEnum.STORE:
        if (!reqDto.areaId) {
          throw new ValidationException(
            ErrorCode.V004,
            HttpStatus.BAD_REQUEST,
            'Area ID is required for store vouchers',
          );
        }
        return this.db
          .insert(vouchers)
          .values({
            ...reqDto,
            status, // Trạng thái voucher tự động được xác định dựa trên ngày bắt đầu và ngày kết thúc
            ...(reqDto.isHidden ? { isHidden: true } : {}),
            userId: payload.id,
            type: VouchersTypeEnum.STORE,
            areaId: reqDto.areaId,
          })
          .returning()
          .then((res) => {
            return plainToInstance(VoucherResDto, res[0]);
          });
      default:
        throw new ForbiddenException();
    }
  }

  async ensureVoucherIsActive(
    totalProduct: number,
    voucherId: number,
    userId: number,
    tx: Transaction,
  ) {
    const [voucher] = await tx
      .select({
        maxUses: vouchers.maxUses,
        usePerUser: vouchers.usePerUser,
        usedCount: count(vouchersOnOrders.voucherId),
        minOrderValue: vouchers.minOrderValue,
      })
      .from(vouchers)
      .leftJoin(vouchersOnOrders, eq(vouchersOnOrders.voucherId, vouchers.id))
      .groupBy(vouchers.id)
      .where(
        and(
          eq(vouchers.id, voucherId),
          isNull(vouchers.deletedAt),
          eq(vouchers.status, VouchersStatusEnum.ACTIVE),
        ),
      );

    const [{ userUsageCount }] = await tx
      .select({
        userUsageCount: sql<number>`COALESCE
          (${voucherUsages.usageCount}, 0)`.mapWith(Number),
      })
      .from(voucherUsages)
      .where(
        and(
          eq(voucherUsages.voucherId, voucherId),
          eq(voucherUsages.userId, userId),
        ),
      );
    if (!voucher) {
      throw new ValidationException(
        ErrorCode.V003,
        HttpStatus.BAD_REQUEST,
        'Voucher not found or inactive',
      );
    }

    if (
      this.configService.get('app', { infer: true }).nodeEnv ===
      Environment.DEVELOPMENT
    ) {
      console.group('🎟️ Voucher Usage Details');
      console.log('🔢 Used Count          :', voucher.usedCount);
      console.log('👤 User Usage Count    :', userUsageCount);
      console.log('📈 Max Uses            :', voucher.maxUses);
      console.log('👥 Uses Per User       :', voucher.usePerUser);
      console.log('💰 Min Order Value     :', voucher.minOrderValue);
      console.log('🛒 Total Product Value :', totalProduct);
      console.groupEnd();
    }

    if (
      voucher.usedCount >= voucher.maxUses ||
      userUsageCount >= voucher.usePerUser
    ) {
      throw new ValidationException(ErrorCode.V006, HttpStatus.BAD_REQUEST);
    }

    if (voucher.minOrderValue && totalProduct < voucher.minOrderValue) {
      throw new ValidationException(
        ErrorCode.V008,
        HttpStatus.BAD_REQUEST,
        `Minimum order value for this voucher is ${voucher.minOrderValue}`,
      );
    }
  }

  async update(voucherId: number, reqDto: UpdateVoucherReqDto) {
    const now = new Date();
    const status = _.cond([
      [
        (d: UpdateVoucherReqDto) => d.startDate && new Date(d.startDate) > now,
        () => VouchersStatusEnum.PENDING,
      ],
      [
        (d: UpdateVoucherReqDto) => d.endDate && new Date(d.endDate) < now,
        () => VouchersStatusEnum.EXPIRED,
      ],
      [_.stubTrue, () => VouchersStatusEnum.ACTIVE], // Trường hợp mặc định
    ])(reqDto);

    return this.db
      .update(vouchers)
      .set({
        ...reqDto,
        ...(reqDto.status ? { status: reqDto.status } : { status }),
      })
      .where(eq(vouchers.id, voucherId))
      .returning()
      .then((res) => {
        if (!res[0]) {
          throw new ValidationException(ErrorCode.V001, HttpStatus.BAD_REQUEST);
        }
        return plainToInstance(VoucherResDto, res[0]);
      });
  }

  async existById(voucherId: number) {
    return this.db
      .select({
        id: vouchers.id,
      })
      .from(vouchers)
      .where(and(isNull(vouchers.deletedAt), eq(vouchers.id, voucherId)))
      .then((res) => res[0]);
  }

  async softDelete(voucherId: number) {
    return this.db.transaction(async (tx) => {
      const voucher = await this.existById(voucherId);
      if (!voucher) {
        throw new ValidationException(ErrorCode.V001, HttpStatus.BAD_REQUEST);
      }
      const [updateVoucher] = await this.db
        .update(vouchers)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(vouchers.id, voucherId))
        .returning();

      switch (updateVoucher.type) {
        case VouchersTypeEnum.MANAGEMENT: {
          // ---------------------------------------------------
          // Hoàn lại điểm cho khu vực
          // ---------------------------------------------------
          const area = await this.areasService.existById(updateVoucher.areaId);
          if (!area) {
            throw new ValidationException(
              ErrorCode.AR001,
              HttpStatus.BAD_REQUEST,
            );
          }
          const [{ usedCount }] = await tx
            .select({
              usedCount: count(vouchersOnOrders.voucherId).mapWith(Number),
            })
            .from(vouchersOnOrders)
            .where(eq(vouchersOnOrders.voucherId, updateVoucher.id))
            .groupBy(vouchersOnOrders.voucherId);
          const refundPoint = round(
            (updateVoucher.maxUses - usedCount) * updateVoucher.value,
            2,
          );
          await tx
            .update(areas)
            .set({
              point: sql`${areas.point} +
              ${refundPoint}`,
            })
            .where(eq(areas.id, updateVoucher.areaId));
        }
      }
    });
  }

  async getDetailById(voucherId: number) {
    const voucher = await this.db
      .select({
        ...getTableColumns(vouchers),
        user: users,
      })
      .from(vouchers)
      .leftJoin(users, eq(users.id, vouchers.userId))
      .where(and(isNull(vouchers.deletedAt), eq(vouchers.id, voucherId)))
      .then((res) => res[0]);
    if (!voucher) {
      throw new ValidationException(ErrorCode.V001, HttpStatus.BAD_REQUEST);
    }
    return plainToInstance(VoucherResDto, voucher);
  }

  async getUsableVouchers(
    reqDto: UsableVoucherReqDto,
    payload: JwtPayloadType,
  ) {
    console.log('reqDto', reqDto);
    const usableVouchers = [];

    //---------------------------------------------------------
    // Lấy voucher type ADMIN vs MANAGEMENT nếu có areaId
    //---------------------------------------------------------
    if (reqDto.areaId) {
      const voucherApps = await this.db
        .select({
          ...getTableColumns(vouchers),
          usedCount: count(vouchersOnOrders.voucherId),
          userUsageCount: sql<number>`COALESCE
            (${voucherUsages.usageCount}, 0)`.mapWith(Number),
        })
        .from(vouchers)
        .leftJoin(vouchersOnOrders, eq(vouchersOnOrders.voucherId, vouchers.id))
        .leftJoin(
          voucherUsages,
          and(
            eq(voucherUsages.voucherId, vouchers.id),
            eq(voucherUsages.userId, payload.id),
          ),
        )
        .where(
          and(
            isNull(vouchers.deletedAt),
            ...(reqDto.isHidden
              ? [
                  eq(vouchers.isHidden, reqDto.isHidden),
                  eq(vouchers.code, reqDto.code),
                ]
              : [eq(vouchers.isHidden, false)]),
            eq(vouchers.status, VouchersStatusEnum.ACTIVE),
            inArray(vouchers.type, [
              VouchersTypeEnum.ADMIN,
              VouchersTypeEnum.MANAGEMENT,
            ]),
            lte(vouchers.startDate, new Date()),
            gte(vouchers.endDate, new Date()),
            eq(vouchers.areaId, reqDto.areaId),
          ),
        )
        .groupBy(
          vouchers.id,
          voucherUsages.usageCount, // chỉ cần usageCount nếu cần so sánh
        )
        .orderBy(desc(vouchers.createdAt))
        .having(
          and(
            lt(count(vouchersOnOrders.voucherId), vouchers.maxUses),
            lt(
              sql`coalesce
                (${voucherUsages.usageCount}, 0)`,
              vouchers.usePerUser,
            ),
          ),
        );

      if (voucherApps?.length > 0) {
        usableVouchers.push(...voucherApps);
      }
    }

    //---------------------------------------------------------
    // Lấy voucher type STORE nếu có storeId
    //---------------------------------------------------------
    if (reqDto.storeId) {
      const storeVouchers = await this.db
        .select({
          ...getTableColumns(vouchers),
          usedCount: count(vouchersOnOrders.voucherId).mapWith(Number),
          usedByUserCount: sql<number>`COALESCE
            (${voucherUsages.usageCount}, 0)`.mapWith(Number),
        })
        .from(vouchers)
        .leftJoin(users, eq(users.id, vouchers.userId))
        .leftJoin(vouchersOnOrders, eq(vouchersOnOrders.voucherId, vouchers.id))
        .leftJoin(
          voucherUsages,
          and(
            eq(voucherUsages.voucherId, vouchers.id),
            eq(voucherUsages.userId, payload.id),
          ),
        )
        .leftJoin(stores, eq(stores.userId, users.id))
        .where(
          and(
            ...(reqDto.isHidden
              ? [
                  eq(vouchers.isHidden, reqDto.isHidden),
                  eq(vouchers.code, reqDto.code),
                ]
              : [eq(vouchers.isHidden, false)]),
            isNull(vouchers.deletedAt),
            eq(vouchers.status, VouchersStatusEnum.ACTIVE),
            eq(vouchers.type, VouchersTypeEnum.STORE),
            eq(stores.id, reqDto.storeId),
            lte(vouchers.startDate, new Date()),
            gte(vouchers.endDate, new Date()),
          ),
        )
        .groupBy(
          vouchers.id,
          users.id,
          voucherUsages.userId,
          voucherUsages.usageCount,
        )
        .orderBy(desc(vouchers.createdAt))
        .having(
          and(
            lt(count(vouchersOnOrders.voucherId), vouchers.maxUses),
            lt(
              sql`coalesce
                (${voucherUsages.usageCount}, 0)`,
              vouchers.usePerUser,
            ),
          ),
        );

      if (storeVouchers && storeVouchers.length > 0) {
        usableVouchers.push(...storeVouchers);
      }
    }

    return usableVouchers;
  }
}
