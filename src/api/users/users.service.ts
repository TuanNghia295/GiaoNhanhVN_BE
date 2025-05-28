import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateUserReqDto } from '@/api/users/dto/create-user.req.dto';
import { LockUserReqDto } from '@/api/users/dto/lock-user.req.dto';
import { PageUserReqDto } from '@/api/users/dto/page-user.req.dto';
import { UpdateUserReqDto } from '@/api/users/dto/update-user.req.dto';
import { UserResDto } from '@/api/users/dto/user.res.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Order } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { RoleEnum, users } from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { normalizeImagePath } from '@/utils/util';
import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import { and, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
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

  async create(
    reqDto: CreateUserReqDto,
    payload: JwtPayloadType,
  ): Promise<UserResDto> {
    console.log('reqDto', await this.existsByPhone(reqDto.phone));
    if (await this.existsByPhone(reqDto.phone)) {
      throw new ValidationException(ErrorCode.U002, HttpStatus.CONFLICT);
    }

    return this.db
      .insert(users)
      .values({
        ...reqDto,
        ...(payload.role === RoleEnum.MANAGEMENT
          ? { areaId: payload.areaId }
          : {}),
      })
      .returning()
      .then((result) => plainToInstance(UserResDto, result[0]));
  }

  async getPageUsers(reqDto: PageUserReqDto, payload: JwtPayloadType) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.users> = {
      where: and(
        isNull(users.deletedAt),
        ...(payload.role === RoleEnum.MANAGEMENT
          ? [eq(users.areaId, payload.areaId)]
          : []),
        ...(payload.role === RoleEnum.ADMIN && reqDto.areaId
          ? [eq(users.areaId, reqDto.areaId)]
          : []),
        or(
          ilike(users.phone, `%${reqDto.q ?? ''}%`),
          ilike(users.fullName, `%${reqDto.q ?? ''}%`),
        ),
      ),
    };

    const qCount = this.db.query.users.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.users.findMany({
        ...baseConfig,
        orderBy: [
          ...(reqDto.order === Order.DESC
            ? [desc(users.createdAt)]
            : [desc(users.createdAt)]),
        ],
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(
      entities.map((e) => plainToInstance(UserResDto, e)),
      meta,
    );
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
    return plainToInstance(UserResDto, user);
  }

  async existById(userId: number) {
    return this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        avatar: true,
      },
    });
  }

  async update(payload: JwtPayloadType, reqDto: UpdateUserReqDto) {
    if (!(await this.existsById(payload.id))) {
      throw new ValidationException(ErrorCode.U001, HttpStatus.NOT_FOUND);
    }

    console.log('reqDto', reqDto);
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
    if (myUser.avatar) {
      const imageName = myUser.avatar.replace(/^.*[\\/]/, '');
      const imagePath = join(this.basePath, imageName);
      if (existsSync(imagePath)) {
        unlinkSync(imagePath);
      }
    }
    let normalizedPath = myUser.avatar; // Keep old image if new one isn't provided
    if (image?.buffer) {
      const fileName = await this.buildFileName('user');
      const fullImagePath = join(this.basePath, fileName);
      await sharp(image.buffer)
        .rotate()
        .jpeg({ quality: 80 })
        .toFile(fullImagePath);
      normalizedPath = normalizeImagePath(fullImagePath);
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
      where: and(
        eq(users.id, userId),
        isNull(users.deletedAt),
        eq(users.isLocked, false),
      ),
      columns: {
        fcmToken: true,
      },
    });
  }
}
