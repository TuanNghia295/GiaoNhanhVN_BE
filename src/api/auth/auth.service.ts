import { LoginReqDto } from '@/api/auth/dto/login.req.dto';
import { LoginResDto } from '@/api/auth/dto/login.res.dto';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { LoginManagerReqDto } from '@/api/managers/dto/login-manager.req.dto';
import { Branded } from '@/common/types/types';
import { AllConfigType } from '@/config/config.type';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import {
  delivers,
  managers,
  RoleEnum,
  stores,
  users,
} from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { hashData } from '@/utils/password.util';
import {
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { eq } from 'drizzle-orm';
import ms from 'ms';

type Token = Branded<
  {
    accessToken: string;
    refreshToken: string;
    expires: number;
  },
  'token'
>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
  ) {}

  // async signIn(reqDto: LoginManagerReqDto): Promise<LoginResDto> {
  //   const { phone, password } = reqDto;
  //   const user = await this.db.query.users.findFirst({
  //     where: eq(users.phone, phone),
  //     columns: {
  //       phone: true,
  //       password: true,
  //       id: true,
  //     },
  //   });
  //
  //   const isPasswordValid =
  //     user && (await verifyPassword(password, user.password));
  //
  //   if (!isPasswordValid) {
  //     throw new UnauthorizedException();
  //   }
  //
  //   const hash = crypto
  //     .createHash('sha256')
  //     .update(randomStringGenerator())
  //     .digest('hex');
  //
  //   const session = await this.db
  //     .insert(sessions)
  //     .values({
  //       hash,
  //       author_id: user.id,
  //     })
  //     .returning();
  //
  //   const token = await this.createToken({
  //     id: user.id,
  //     sessionId: session[0].id,
  //     hash,
  //   });
  //
  //   return plainToInstance(LoginResDto, {
  //     ...token,
  //     user_id: user.id,
  //   });
  // }

  async createToken(data: {
    id: number;
    sessionId?: string;
    areaId?: number;
    role?: string;
    hash?: string;
  }): Promise<Token> {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });
    const expires = Date.now() + ms(tokenExpiresIn);

    const [accessToken, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          role: data.role ?? '',
          sessionId: data.sessionId,
          areaId: data.areaId ?? '',
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
          role: data.role ?? '',
          areaId: data.areaId ?? '',
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      expires,
    } as Token;
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException();
    }

    switch (payload.role) {
      case RoleEnum.USER: {
        const myUser = await this.db.query.users.findFirst({
          where: eq(users.id, payload.id),
          columns: {
            id: true,
            isLocked: true,
          },
        });
        if (!myUser) {
          throw new UnauthorizedException();
        }
        if (myUser.isLocked) {
          throw new UnauthorizedException('Account has been locked');
        }
        break;
      }
      case RoleEnum.DELIVER: {
        const myDeliver = await this.db.query.delivers.findFirst({
          where: eq(delivers.id, payload.id),
          columns: {
            id: true,
            status: true,
          },
        });
        if (!myDeliver) {
          throw new UnauthorizedException();
        }
        console.log('myDeliver', myDeliver);
        if (!myDeliver.status) {
          throw new UnauthorizedException('Account has been locked');
        }
        break;
      }
    }

    // Force logout if the session is in the blacklist
    // const isSessionBlacklisted = await this.cacheService.get<boolean>(
    //   createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
    // );
    //
    // if (isSessionBlacklisted) {
    //   throw new UnauthorizedException();
    // }

    return payload;
  }

  async loginUser(reqDto: LoginReqDto) {
    const { phone, password } = reqDto;
    const user = await this.db.query.users.findFirst({
      where: eq(users.phone, phone),
      columns: {
        phone: true,
        role: true,
        areaId: true,
        isLocked: true,
        password: true,
        id: true,
      },
    });

    const isPasswordValid = user && user.password === password;

    if (!isPasswordValid) {
      throw new ValidationException(ErrorCode.U001, HttpStatus.UNAUTHORIZED);
    }
    if (user.isLocked) {
      throw new ValidationException(ErrorCode.U003, HttpStatus.UNAUTHORIZED);
    }

    // const hash = crypto
    //   .createHash('sha256')
    //   .update(randomStringGenerator())
    //   .digest('hex');
    //
    // const session = await this.db
    //   .insert(sessions)
    //   .values({
    //     hash,
    //     authorId: user.id,
    //   })
    //   .returning();

    //----------------------------------------------------------
    // - TODO: add role
    // - Kiểm tra nếu tài khoản  đã đăng ký cửa hàng thì sẽ trả về role là STORE
    //----------------------------------------------------------
    const baseRole = (await this.existStoreByUserId(user.id))
      ? RoleEnum.STORE
      : user.role;
    const tokens = await this.createToken({
      id: user.id,
      // sessionId: session[0].id,
      role: baseRole,
    });

    //---------------------------------------------------
    // Cập nhật fcm token cho user
    //---------------------------------------------------
    await this.db
      .update(users)
      .set({
        refreshToken: await hashData(tokens.refreshToken),
        ...(reqDto.fcmToken && { fcmToken: reqDto.fcmToken }),
      })
      .where(eq(users.id, user.id));

    return plainToInstance(LoginResDto, {
      ...tokens,
      role: baseRole,
      userId: user.id,
    });
  }

  async existStoreByUserId(userId: number) {
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.userId, userId),
      columns: {
        id: true,
      },
    });
    return !!store;
  }

  async loginManager(reqDto: LoginManagerReqDto): Promise<LoginResDto> {
    const { username, password } = reqDto;
    const manager = await this.db.query.managers.findFirst({
      where: eq(managers.username, username),
      columns: {
        phone: true,
        role: true,
        areaId: true,
        password: true,
        id: true,
      },
    });

    const isPasswordValid = manager && manager.password === password;

    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    const token = await this.createToken({
      id: manager.id,
      areaId: manager.areaId,
      // sessionId: session[0].id,
      role: manager.role,
    });

    return plainToInstance(LoginResDto, {
      ...token,
      role: manager.role,
      areaId: manager.areaId,
      userId: manager.id,
    });
  }

  async loginDeliver(reqDto: LoginReqDto) {
    const { phone, password } = reqDto;
    const deliver = await this.db.query.delivers.findFirst({
      where: eq(delivers.phone, phone),
      columns: {
        phone: true,
        role: true,
        areaId: true,
        password: true,
        status: true,
        id: true,
      },
    });

    const isPasswordValid = deliver && deliver.password === password;

    if (!isPasswordValid) {
      throw new ValidationException(ErrorCode.D002, HttpStatus.UNAUTHORIZED);
    }

    if (!deliver.status) {
      throw new ValidationException(ErrorCode.D003, HttpStatus.UNAUTHORIZED);
    }
    const token = await this.createToken({
      id: deliver.id,
      // sessionId: session[0].id,
      areaId: deliver.areaId,
      role: RoleEnum.DELIVER,
    });

    //---------------------------------------------------
    // Cập nhật fcm token cho deliver
    //---------------------------------------------------
    await this.db
      .update(delivers)
      .set({
        refreshToken: await hashData(token.refreshToken),
        ...(reqDto.fcmToken && { fcmToken: reqDto.fcmToken }),
      })
      .where(eq(delivers.id, deliver.id));
    return plainToInstance(LoginResDto, {
      ...token,
      role: RoleEnum.DELIVER,
      userId: deliver.id,
    });
  }
}
