import { AreasService } from '@/api/areas/areas.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { NotificationsService } from '@/api/notifications/notifications.service';
import { CreateStoreReqDto } from '@/api/store-requests/dto/create-store-req.dto';
import { PageStoreRequestReqDto } from '@/api/store-requests/dto/page-store-request-req.dto';
import { StoreRequestResDto } from '@/api/store-requests/dto/store-request.res.dto';
import { StoresService } from '@/api/stores/stores.service';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, withPagination } from '@/database/global';
import {
  notificationsToUsers,
  RoleEnum,
  storeRequests,
  StoreRequestStatusEnum,
  stores,
  users,
} from '@/database/schemas';
import {
  notifications,
  NotificationTypeEnum,
} from '@/database/schemas/notification.schema';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { buildMulticastMessage } from '@/utils/firebase.util';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
} from 'drizzle-orm';
import admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../../firebase/firebase.module';

@Injectable()
export class StoreRequestsService {
  constructor(
    private readonly areasService: AreasService,
    private readonly storesService: StoresService,
    private readonly emitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
    @Inject(FIREBASE_ADMIN) private readonly admin: admin.app.App,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  private readonly logger = new Logger(StoreRequestsService.name);

  async getPageStoreRequests(
    reqDto: PageStoreRequestReqDto,
    payload: JwtPayloadType,
  ) {
    const whereClause = and(
      ...(reqDto.q
        ? [
            or(
              ilike(users.fullName, `%${reqDto.q}%`),
              ilike(users.phone, `%${reqDto.q}%`),
              ilike(users.email, `%${reqDto.q}%`),
            ),
          ]
        : []),
      ...(reqDto.areaId ? [eq(storeRequests.areaId, reqDto.areaId)] : []),
      ...(payload.role === RoleEnum.MANAGEMENT
        ? [eq(storeRequests.areaId, payload.areaId)]
        : []),
    );
    const qb = this.db
      .select({
        ...getTableColumns(storeRequests),
        user: users,
      })
      .from(storeRequests)
      .leftJoin(users, eq(users.id, storeRequests.userId))
      .$dynamic();

    await withPagination(qb, reqDto.limit, reqDto.offset);

    const [entities, { totalCount }] = await Promise.all([
      qb
        .where(whereClause)
        .orderBy(
          sql.raw("CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END"),
          desc(storeRequests.createdAt),
        ),
      this.db
        .select({
          totalCount: count(),
        })
        .from(storeRequests)
        .leftJoin(users, eq(users.id, storeRequests.userId))
        .where(whereClause)
        .execute()
        .then((res) => res[0]),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entities, meta);
  }

  async getCount(payload: JwtPayloadType) {
    const qb = this.db
      .select({ totalCount: count() })
      .from(storeRequests)
      .where(
        and(
          ...(payload.role === RoleEnum.MANAGEMENT && payload.areaId
            ? [eq(storeRequests.areaId, payload.areaId)]
            : []),
          eq(storeRequests.status, StoreRequestStatusEnum.PENDING),
        ),
      );

    const [{ totalCount }] = await qb.execute();
    return totalCount;
  }

  async existStoreRequestById(storeRequestId: number): Promise<{
    id: number;
    status: StoreRequestStatusEnum;
    userId: number;
    areaId: number;
  }> {
    return await this.db
      .select({
        id: storeRequests.id,
        status: storeRequests.status,
        userId: storeRequests.userId,
        areaId: storeRequests.areaId,
      })
      .from(storeRequests)
      .where(eq(storeRequests.id, storeRequestId))
      .execute()
      .then((res) => res[0] ?? null);
  }

  async existStoreRequestByUserId(
    userId: number,
  ): Promise<{ id: number; status: StoreRequestStatusEnum }> {
    return await this.db
      .select({
        id: storeRequests.id,
        status: storeRequests.status,
      })
      .from(storeRequests)
      .where(
        and(
          eq(storeRequests.status, StoreRequestStatusEnum.PENDING),
          eq(storeRequests.userId, userId),
        ),
      )
      .execute()
      .then((res) => res[0] ?? null);
  }

  async registerStore(payload: JwtPayloadType, reqDto: CreateStoreReqDto) {
    if (!(await this.areasService.existById(reqDto.areaId))) {
      throw new ValidationException(ErrorCode.AR001);
    }

    // kiểm tra cửa hàng đã tồn tại hay chưa
    if (await this.storesService.existById(payload.id)) {
      throw new ValidationException(ErrorCode.S002);
    }
    // mỗi người chỉ được đăng ký 1 cửa hàng
    if (await this.existStoreRequestByUserId(payload.id)) {
      throw new ValidationException(ErrorCode.SR002);
    }

    return this.db.transaction(async (tx) => {
      // await tx.insert(notifications).values({
      //   userId: payload.id,
      //   type: NotificationTypeEnum.SYSTEM,
      //   title: 'Đăng ký cửa hàng',
      //   body: `Yêu cầu mở shop của bạn đang chờ xét duyệt từ admin. Nếu thời gian chờ quá lâu, vui lòng liên hệ hotline`,
      // });
      const [createdStoreRequest] = await tx
        .insert(storeRequests)
        .values({
          ...reqDto,
          userId: payload.id,
        })
        .returning();
      const [createdNotification] = await tx
        .insert(notifications)
        .values({
          type: NotificationTypeEnum.SYSTEM,
          title: 'Đăng ký cửa hàng',
          body: `Yêu cầu mở shop của bạn đã được gửi đi. Vui lòng chờ admin xét duyệt`,
        })
        .returning({
          id: notifications.id,
        });

      await this.db
        .insert(notificationsToUsers)
        .values({
          userId: payload.id,
          notificationId: createdNotification.id,
        })
        .execute();

      await this.emitter.emitAsync('store-requests.created', {
        userId: payload.id,
        areaId: reqDto.areaId,
      });
      return plainToInstance(StoreRequestResDto, createdStoreRequest);
    });
  }

  private async notifyAcceptedStoreRequest(
    tokens: string[],
    type: 'REJECT_STORE_REQUEST' | 'ACCEPT_STORE_REQUEST',
  ) {
    const validTokens = tokens.filter((t) => !!t);
    console.log('Valid FCM tokens:', validTokens);
    if (validTokens.length === 0) return;
    try {
      await this.admin.messaging().sendEachForMulticast(
        buildMulticastMessage(validTokens, type, {
          status: type === 'ACCEPT_STORE_REQUEST' ? 'approved' : 'rejected',
        }),
      );
    } catch (error) {
      this.logger.error('Error sending FCM notification', error);
    }
  }

  async approve(storeRequestId: number) {
    return this.db.transaction(async (tx) => {
      const storeRequest = await this.existStoreRequestById(storeRequestId);
      if (!storeRequest) {
        tx.rollback();
        throw new ValidationException(ErrorCode.SR001);
      }

      if (storeRequest.status !== StoreRequestStatusEnum.PENDING) {
        tx.rollback();
        throw new ValidationException(ErrorCode.SR003);
      }
      await tx
        .update(storeRequests)
        .set({ status: StoreRequestStatusEnum.APPROVED })
        .where(eq(storeRequests.id, storeRequestId))
        .execute();

      await tx
        .update(users)
        .set({ role: RoleEnum.STORE })
        .where(eq(users.id, storeRequest.userId))
        .execute();

      await tx
        .insert(stores)
        .values({
          userId: storeRequest.userId,
          areaId: storeRequest.areaId,
        })
        .execute();

      const [createdNotification] = await tx
        .insert(notifications)
        .values({
          type: NotificationTypeEnum.SYSTEM,
          title: 'Đăng ký cửa hàng',
          body: `Yêu cầu mở shop của bạn đã được chấp nhận. Vui lòng kiểm tra lại thông tin cửa hàng`,
        })
        .returning({
          id: notifications.id,
        });

      await this.db
        .insert(notificationsToUsers)
        .values({
          userId: storeRequest.userId,
          notificationId: createdNotification.id,
        })
        .execute();

      const fcmToken = await this.db
        .select({ fcmToken: users.fcmToken })
        .from(users)
        .where(eq(users.id, storeRequest.id))
        .execute();

      console.log('FCM Tokens:', fcmToken);
      // gửi thông báo đến người dùng
      await this.notifyAcceptedStoreRequest(
        fcmToken.map((t) => t.fcmToken),
        'ACCEPT_STORE_REQUEST',
      );

      /// socket
      await this.emitter.emitAsync('store-requests.approved', {
        userId: storeRequest.userId,
        areaId: storeRequest.areaId,
      });

      return plainToInstance(StoreRequestResDto, storeRequest);
    });
  }

  async reject(storeRequestId: number) {
    return this.db.transaction(async (tx) => {
      const storeRequest = await this.existStoreRequestById(storeRequestId);
      if (!storeRequest) {
        tx.rollback();
        throw new ValidationException(ErrorCode.SR001);
      }

      if (storeRequest.status !== StoreRequestStatusEnum.PENDING) {
        tx.rollback();
        throw new ValidationException(ErrorCode.SR003);
      }
      await tx
        .update(storeRequests)
        .set({ status: StoreRequestStatusEnum.REJECTED })
        .where(eq(storeRequests.id, storeRequestId))
        .execute();

      await tx
        .insert(notifications)
        .values({
          userId: storeRequest.userId,
          type: NotificationTypeEnum.SYSTEM,
          title: 'Đăng ký cửa hàng',
          body: `Yêu cầu mở shop của bạn đã bị từ chối. Vui lòng liên hệ hotline`,
        })
        .execute();

      const fcmToken = await this.db
        .select({ fcmToken: users.fcmToken })
        .from(users)
        .where(eq(users.id, storeRequest.id))
        .execute();

      // gửi thông báo đến người dùng
      await this.notifyAcceptedStoreRequest(
        fcmToken.map((t) => t.fcmToken),
        'REJECT_STORE_REQUEST',
      );

      return plainToInstance(StoreRequestResDto, storeRequest);
    });
  }
}
