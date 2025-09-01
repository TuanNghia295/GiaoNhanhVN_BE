import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { ChangePasswordReqDto } from '@/api/users/dto/change-password.req.dto';
import { CreateUserReqDto } from '@/api/users/dto/create-user.req.dto';
import { LockUserReqDto } from '@/api/users/dto/lock-user.req.dto';
import { PageUserReqDto } from '@/api/users/dto/page-user.req.dto';
import { UpdateUserReqDto } from '@/api/users/dto/update-user.req.dto';
import { UserResDto } from '@/api/users/dto/user.res.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Order } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { decrement, DRIZZLE, increment, Transaction } from '@/database/global';
import {
  areas,
  coinLogs,
  ProviderEnum,
  RoleEnum,
  transactionLogs,
  TransactionTypeEnum,
  users,
} from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { deleteIfExists, formatNumber, normalizeImagePath } from '@/utils/util';
import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    private readonly emitter: EventEmitter2,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  private basePath = `uploads/users`;

  onModuleInit() {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
      console.log(`Đã tạo thư mục upload: ${this.basePath}`);
    }
  }

  async existsByPhone(phone: string) {
    return this.db.query.users.findFirst({
      where: eq(users.phone, phone),
      columns: {
        id: true,
      },
    });
  }

  async create(reqDto: CreateUserReqDto, payload: JwtPayloadType): Promise<UserResDto> {
    console.log('reqDto', await this.existsByPhone(reqDto.phone));
    if (await this.existsByPhone(reqDto.phone)) {
      throw new ValidationException(ErrorCode.U002, HttpStatus.CONFLICT);
    }

    return this.db
      .insert(users)
      .values({
        ...reqDto,
        provider: ProviderEnum.PASSWORD,
        ...(payload.role === RoleEnum.MANAGEMENT ? { areaId: payload.areaId } : {}),
      })
      .returning()
      .then((result) => plainToInstance(UserResDto, result[0]));
  }

  async getPageUsers(reqDto: PageUserReqDto, payload: JwtPayloadType) {
    console.log('reqDto', reqDto);
    const baseConfig: FindManyQueryConfig<typeof this.db.query.users> = {
      where: and(
        isNull(users.deletedAt),
        ...(payload.role === RoleEnum.MANAGEMENT ? [eq(users.areaId, payload.areaId)] : []),
        ...(payload.role === RoleEnum.ADMIN && reqDto.areaId
          ? [eq(users.areaId, reqDto.areaId)]
          : []),
        or(ilike(users.phone, `%${reqDto.q ?? ''}%`), ilike(users.fullName, `%${reqDto.q ?? ''}%`)),
      ),
      with: {
        area: true,
      },
    };

    const qCount = this.db.query.users.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.users.findMany({
        ...baseConfig,
        orderBy: [
          ...(reqDto.order === Order.DESC ? [desc(users.createdAt)] : [desc(users.createdAt)]),
        ],
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entities, meta);
  }

  async existsById(userId: number) {
    return this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
      },
    });
  }

  async lockUser(reqDto: LockUserReqDto) {
    if (!(await this.existsById(reqDto.userId))) {
      throw new ValidationException(ErrorCode.U001, HttpStatus.NOT_FOUND);
    }

    const [user] = await this.db
      .update(users)
      .set({
        isLocked: reqDto.isLocked,
        //if isLocked is true, set refreshToken to null
        ...(reqDto.isLocked ? { refreshToken: null } : {}),
      })
      .where(eq(users.id, reqDto.userId))
      .returning();

    if (reqDto.isLocked) {
      this.emitter.emit('user.locked', user);
    }
    return plainToInstance(UserResDto, user);
  }

  async getUserById(userId: number) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) {
      throw new ValidationException(ErrorCode.U001, HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async existById(userId: number) {
    return this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        password: true,
        avatar: true,
      },
    });
  }

  async getNearestAreaId(latitude: number, longitude: number): Promise<number | null> {
    // Lấy area gần nhất
    const nearestArea = await this.db
      .select({
        id: areas.id,
        distance: sql<number>`
        6371 * acos(
          cos(radians(${latitude})) *
          cos(radians(CAST(split_part(${areas.location}, ',', 1) AS double precision))) *
          cos(radians(CAST(split_part(${areas.location}, ',', 2) AS double precision)) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(CAST(split_part(${areas.location}, ',', 1) AS double precision)))
        )
      `.as('distance'),
      })
      .from(areas)
      .where(isNotNull(areas.location))
      .orderBy(sql`distance ASC`)
      .limit(1);

    return nearestArea.length > 0 ? nearestArea[0].id : null;
  }

  async update(payload: JwtPayloadType, reqDto: UpdateUserReqDto) {
    if (!(await this.existsById(payload.id))) {
      throw new ValidationException(ErrorCode.U001, HttpStatus.NOT_FOUND);
    }

    // if (reqDto.phone && (await this.existsByPhone(reqDto.phone))) {
    //   throw new ValidationException(ErrorCode.U002, HttpStatus.CONFLICT);
    // }

    // Nếu người dùng có cung cấp vị trí thì cập nhật areaId
    if (reqDto.origins) {
      console.log('reqDto.origins', reqDto.origins);
      const [latitude, longitude] = reqDto.origins.split(',').map(Number);
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new ValidationException(ErrorCode.CV000, HttpStatus.BAD_REQUEST);
      }
      const areaId = await this.getNearestAreaId(latitude, longitude);
      console.log('areaId', areaId);
      if (areaId) {
        reqDto.areaId = areaId;
      }
    }

    //----------------------------------------------------------------
    // Nếu người dùng nằm trong khu vực quản lý  thì cập nhật areaId
    //----------------------------------------------------------------
    // let areaId: number | null = null;
    // if (reqDto.parent && reqDto.province) {
    //   const area = await this.db.query.areas.findFirst({
    //     where: and(eq(areas.parent, reqDto.parent), eq(areas.name, reqDto.province)),
    //     columns: {
    //       id: true,
    //     },
    //   });
    //   if (area) {
    //     areaId = area.id;
    //   }
    // }

    return this.db
      .update(users)
      .set({
        ...reqDto,
      })
      .where(eq(users.id, payload.id))
      .returning()
      .then((result) => plainToInstance(UserResDto, result[0]));
  }

  private async buildFileName(prefix: string): Promise<string> {
    const uniqueId = uuidv4();
    return `${prefix}_${uniqueId}.jpeg`;
  }

  async updateImage(payload: JwtPayloadType, image: Express.Multer.File) {
    const myUser = await this.existById(payload.id);
    if (!myUser) {
      throw new ValidationException(ErrorCode.B001);
    }

    let normalizedPath = myUser.avatar; // Keep old image if new one isn't provided
    if (image?.buffer) {
      const fileName = await this.buildFileName('user');
      const fullImagePath = join(this.basePath, fileName);
      await sharp(image.buffer).rotate().jpeg({ quality: 80 }).toFile(fullImagePath);
      normalizedPath = normalizeImagePath(fullImagePath);
    }

    //------------------------------------------------------------
    //- Xoá ảnh cũ nếu có
    //------------------------------------------------------------
    if (myUser.avatar && myUser.avatar !== normalizedPath) {
      deleteIfExists(myUser.avatar, this.basePath);
    }

    const updated = await this.db
      .update(users)
      .set({
        avatar: normalizedPath,
      })
      .where(eq(users.id, myUser.id))
      .returning();

    return plainToInstance(UserResDto, updated[0]);
  }

  async getValidUserFcmTokenById(userId: number) {
    return this.db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt), eq(users.isLocked, false)),
      columns: {
        fcmToken: true,
      },
    });
  }

  async getValidUserFcmTokenByIds(userIds: number[]) {
    return this.db.query.users.findFirst({
      where: and(inArray(users.id, userIds), isNull(users.deletedAt), eq(users.isLocked, false)),
      columns: {
        fcmToken: true,
      },
    });
  }

  async changePassword(payload: JwtPayloadType, reqDto: ChangePasswordReqDto) {
    const user = await this.existById(payload.id);
    if (!user) {
      throw new ValidationException(ErrorCode.U001);
    }

    if (user.password !== reqDto.oldPassword) {
      throw new ValidationException(ErrorCode.U004);
    }

    return this.db
      .update(users)
      .set({
        password: reqDto.newPassword,
      })
      .where(eq(users.id, payload.id))
      .returning()
      .then((result) => plainToInstance(UserResDto, result[0]));
  }

  async logout(userId: number) {
    return this.db
      .update(users)
      .set({
        refreshToken: null,
      })
      .where(eq(users.id, userId));
  }

  async incrementCoin(userId: number, coin: number, payload: JwtPayloadType) {
    return this.db.transaction(async (tx) => {
      if (!(await this.existById(userId))) {
        throw new ValidationException(ErrorCode.U001, HttpStatus.NOT_FOUND);
      }

      // Cập nhật coin của người dùng
      const updatedUser = await tx
        .update(users)
        .set({
          coin: increment(users.coin, coin),
        })
        .where(eq(users.id, userId))
        .returning()
        .then((result) => plainToInstance(UserResDto, result[0]));

      // trừ ví khu vực nếu có
      if (payload.role === RoleEnum.MANAGEMENT && payload.areaId) {
        const area = await tx.query.areas.findFirst({
          where: eq(areas.id, payload.areaId),
          columns: {
            id: true,
            point: true,
          },
        });

        if (!area) {
          throw new ValidationException(ErrorCode.A001, HttpStatus.NOT_FOUND);
        }

        if (area.point < coin) {
          throw new ValidationException(ErrorCode.A002, HttpStatus.BAD_REQUEST);
        }

        // Trừ coin của khu vực
        await tx
          .update(areas)
          .set({
            point: decrement(areas.point, coin),
          })
          .where(eq(areas.id, payload.areaId));
      }

      //---------------------------------------------------
      // Log transaction
      //---------------------------------------------------
      await tx.insert(transactionLogs).values({
        areaId: payload.areaId,
        type: TransactionTypeEnum.DEPOSIT,
        point: coin,
        description: `Nạp ${formatNumber(coin)} xu vào tài khoản của người dùng ${updatedUser.fullName} (${updatedUser.phone})`,
      });
      // Ghi log coin
      await tx.insert(coinLogs).values({
        userId: userId,
        coin: coin,
        areaId: payload.areaId,
      });

      return updatedUser;
    });
  }

  async refundCoin(userId: number, coinUsed: number, tx: Transaction) {
    if (!(await this.existById(userId))) {
      throw new ValidationException(ErrorCode.U001, HttpStatus.NOT_FOUND);
    }
    await tx
      .update(users)
      .set({
        coin: increment(users.coin, coinUsed),
      })
      .where(eq(users.id, userId));
  }
}
