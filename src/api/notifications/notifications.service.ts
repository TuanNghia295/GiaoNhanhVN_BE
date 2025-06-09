import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateNotificationReqDto } from '@/api/notifications/dto/create-notification.req.dto';
import { NotificationResDto } from '@/api/notifications/dto/notification.res.dto';
import { PageNotificationsReqDto } from '@/api/notifications/dto/page-notifications-req.dto';
import { UpdateNotificationReqDto } from '@/api/notifications/dto/update-notification.req.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import {
  notifications,
  notificationsToUsers,
  NotificationTypeEnum,
  RoleEnum,
  users,
} from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { deleteIfExists, normalizeImagePath } from '@/utils/util';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  isNull,
  SQL,
} from 'drizzle-orm';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private basePath = 'uploads/notifications';

  onModuleInit() {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath);
      console.log(`Đã tạo thư mục upload: ${this.basePath}`);
    }
  }

  constructor(
    private readonly emitter: EventEmitter2,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  private async buildFileName(prefix: string): Promise<string> {
    const uniqueId = uuidv4();
    return `${prefix}_${uniqueId}.jpeg`;
  }

  async create(
    payload: JwtPayloadType,
    reqDto: CreateNotificationReqDto,
    image: Express.Multer.File,
  ) {
    const fileName = await this.buildFileName('notification');
    const fullImagePath = join(this.basePath, fileName);
    await sharp(image.buffer).jpeg({ quality: 80 }).toFile(fullImagePath);
    const normalizedPath = normalizeImagePath(fullImagePath);

    return await this.db.transaction(async (tx) => {
      const [notification] = await tx
        .insert(notifications)
        .values({
          ...reqDto,
          type: NotificationTypeEnum.ADMIN,
          image: normalizedPath,
        })
        .returning();
      // Lấy tất cả userId

      const userIds = await tx
        .select({
          id: users.id,
        })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            ...(payload.role === RoleEnum.MANAGEMENT && payload.areaId
              ? [eq(users.areaId, payload.areaId)]
              : []),
            ...(payload.role === RoleEnum.ADMIN && reqDto.areaId
              ? [eq(users.areaId, reqDto.areaId)]
              : []),
          ),
        );

      await tx.insert(notificationsToUsers).values(
        userIds.map((user) => ({
          userId: user.id,
          notificationId: notification.id,
        })),
      );

      // Emit sự kiện thông báo mới
      this.emitter.emit('notification.created', {
        notificationId: notification.id,
        userIds: userIds.map((user) => user.id).map(String),
      });

      return notification;
    });
  }

  async getPageNotifications(
    reqDto: PageNotificationsReqDto,
    payload: JwtPayloadType,
  ) {
    const qb = this.db
      .select({
        ...getTableColumns(notifications),
        userId: notificationsToUsers.userId, // cần để xác định user nhận thông báo
        isRead: notificationsToUsers.isRead,
      })
      .from(notifications)
      .innerJoin(
        notificationsToUsers,
        eq(notificationsToUsers.notificationId, notifications.id),
      )
      .$dynamic();

    let whereClause: SQL;

    switch (payload.role) {
      case RoleEnum.USER:
      case RoleEnum.STORE:
        whereClause = eq(notificationsToUsers.userId, Number(payload.id));
        break;

      case RoleEnum.MANAGEMENT:
        whereClause = and(
          eq(notifications.type, NotificationTypeEnum.ADMIN),
          eq(notifications.areaId, payload.areaId),
        );
        break;

      case RoleEnum.ADMIN:
        whereClause = and(
          eq(notifications.type, NotificationTypeEnum.ADMIN),
          ...(reqDto.areaId ? [eq(notifications.areaId, reqDto.areaId)] : []),
        );
        break;

      default:
    }

    // Count query - tránh đếm toàn bộ bảng
    const countQb = this.db
      .select({ totalCount: count() })
      .from(
        this.db
          .select({ id: notifications.id })
          .from(notifications)
          .innerJoin(
            notificationsToUsers,
            eq(notificationsToUsers.notificationId, notifications.id),
          )
          .where(whereClause)
          .as('base_count'),
      );

    const [entities, [{ totalCount }]] = await Promise.all([
      qb
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(reqDto.limit)
        .offset(reqDto.offset)
        .execute(),
      countQb.execute(),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);

    return new OffsetPaginatedDto(
      entities.map((e) => plainToInstance(NotificationResDto, e)),
      meta,
    );
  }

  async getMyNotifications(payload: JwtPayloadType) {
    return await this.db
      .select()
      .from(notifications)
      .leftJoin(
        notificationsToUsers,
        eq(notificationsToUsers.notificationId, notifications.id),
      )
      .where(and(eq(notificationsToUsers.userId, payload.id)))
      .orderBy(desc(notifications.createdAt));
  }

  async getDetail(notificationId: number) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .then((res) => plainToInstance(NotificationResDto, res[0]));
  }

  async existById(notificationId: number) {
    return this.db
      .select({
        notificationId: notifications.id,
        image: notifications.image,
      })
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .then((res) => res[0]);
  }

  async update(
    id: number,
    reqDto: UpdateNotificationReqDto,
    image?: Express.Multer.File,
  ) {
    const existingNotification = await this.existById(id);
    if (!existingNotification) {
      throw new ValidationException(ErrorCode.N001);
    }
    let normalizedPath: string = existingNotification.image;
    if (image) {
      const fileName = await this.buildFileName('notification');
      const fullImagePath = join(this.basePath, fileName);
      await sharp(image.buffer).jpeg({ quality: 80 }).toFile(fullImagePath);
      normalizedPath = normalizeImagePath(fullImagePath);
    }

    //------------------------------------------------------------
    //- Xoá ảnh cũ nếu có
    //------------------------------------------------------------
    if (
      existingNotification.image &&
      existingNotification.image !== normalizedPath
    ) {
      deleteIfExists(existingNotification.image, this.basePath);
    }

    return await this.db
      .update(notifications)
      .set({
        ...reqDto,
        image: normalizedPath,
      })
      .where(eq(notifications.id, id))
      .returning()
      .then((res) => plainToInstance(NotificationResDto, res[0]));
  }

  async remove(notificationId: number, payload: JwtPayloadType) {
    switch (payload.role) {
      case RoleEnum.USER:
      case RoleEnum.STORE:
        return this.db
          .delete(notificationsToUsers)
          .where(
            and(
              eq(notificationsToUsers.notificationId, notificationId),
              eq(notificationsToUsers.userId, payload.id),
            ),
          )
          .returning();
      case RoleEnum.MANAGEMENT:
      case RoleEnum.ADMIN:
        return this.db.transaction(async (tx) => {
          await tx
            .delete(notificationsToUsers)
            .where(eq(notificationsToUsers.notificationId, notificationId));

          return tx
            .delete(notifications)
            .where(eq(notifications.id, notificationId))
            .returning();
        });
    }
  }

  async getUnreadCount(payload: JwtPayloadType) {
    return await this.db
      .select({
        count: count(notificationsToUsers.id),
      })
      .from(notificationsToUsers)
      .where(
        and(
          eq(notificationsToUsers.userId, payload.id),
          eq(notificationsToUsers.isRead, false),
        ),
      )
      .then((res) => res[0].count);
  }

  async markAsRead(payload: JwtPayloadType) {
    return this.db
      .update(notificationsToUsers)
      .set({
        isRead: true,
      })
      .where(and(eq(notificationsToUsers.userId, payload.id)))
      .returning();
  }
}
