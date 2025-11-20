import { AllConfigType } from '@/config/config.type';

import { AuthService } from '@/api/auth/auth.service';
import { StoresService } from '@/api/stores/stores.service';
import { VerifyZaloResDto } from '@/api/zalo/dto/verify-otp.res.dto';
import { Environment } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { ProviderEnum, RoleEnum, User, users, zalo } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { formatVietnamPhoneNumber } from '@/utils/util';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosError } from 'axios';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import { eq } from 'drizzle-orm';
import { catchError, firstValueFrom } from 'rxjs';
import { UsersService } from '../users/users.service';
import { VerifyOtpReqDto } from './dto/verify-otp.req.dto';

@Injectable()
export class ZaloService implements OnModuleInit {
  private readonly logger = new Logger(ZaloService.name);
  private zaloConfig: {
    app_id: string;
    app_secret: string;
    api_url: string;
    oauth_url: string;
    open_api_url: string;
    zns_template_id: string;
    zns_open_api_url: string;
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly usersService: UsersService,
    private readonly storeService: StoresService,
    private readonly authService: AuthService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {
    this.zaloConfig = this.configService.getOrThrow('zalo', {
      infer: true,
    });
  }
  onModuleInit() {
    // this.refreshToken()
  }

  /**
   * Tự động refresh token mỗi 6 giờ
   * @returns Thông báo cập nhật token thành công
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async refreshToken() {
    const zalo = await this.findZaloToken();
    if (!zalo) {
      throw new UnauthorizedException('Zalo not found');
    }
    const app_id = this.zaloConfig.app_id;
    const app_secret = this.zaloConfig.app_secret;
    const oauth_url = this.zaloConfig.oauth_url;
    console.log('Refreshing Zalo token...');
    console.log('Zalo config:', app_id, app_secret, oauth_url);
    try {
      const response = await this.httpService.axiosRef.post(
        `${oauth_url}/v4/oa/access_token`,
        {
          app_id,
          grant_type: 'refresh_token',
          refresh_token: zalo.refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            secret_key: app_secret,
          },
        },
      );
      if (response.status !== 200 || response.data.error) {
        throw response.data;
      }
      this.logger.log('Zalo token is updated');
      await this.createZaloToken(response.data.access_token, response.data.refresh_token);
      return {
        status: 'success',
        message: 'Zalo token is updated',
      };
    } catch (error) {
      this.logger.error('Error when get access token from Zalo', error);
      throw new UnauthorizedException(error.error_name ?? 'Unauthorized');
    }
  }

  private readonly MAX_OTP = 5; // tối đa 3 lần
  private readonly WINDOW_SEC = 60 * 60 * 1000; // 1 giờ

  async sendZaloOtp(phone: string) {
    const zaloConfig = await this.findZaloToken();
    if (!zaloConfig?.accessToken) {
      throw new UnauthorizedException('Zalo access token is not available.');
    }

    //-----------------------------------------------
    // Kiểm tra và cập nhật rate limit
    //-----------------------------------------------
    const rateLimitKey = createCacheKey(CacheKey.OTP_RATE_LIMIT, phone);
    const currentCount = (await this.cache.get<number>(rateLimitKey)) || 0;
    // get info expire time
    const expireTime = await this.cache.ttl(rateLimitKey);
    console.log('expireTime', expireTime, 'seconds');
    if (currentCount >= this.MAX_OTP) {
      throw new ValidationException(ErrorCode.Z007, HttpStatus.TOO_MANY_REQUESTS);
    }
    //-----------------------------------------------
    // Tạo mã OTP
    //------------------------------------------------
    const otpCode = Math.floor(100000 + Math.random() * 900000);

    //-------------------------------------------------
    // Định dạng số điện thoại Việt Nam
    //-------------------------------------------------
    const vietnamesePhone = formatVietnamPhoneNumber(phone);
    const cacheKey = createCacheKey(CacheKey.OTP_VERIFICATION, phone);
    console.log('cacheKey', cacheKey, phone);
    ///1763643251909 = bao nhiêu giờ?
    await this.cache.set(cacheKey, otpCode, 5 * 60 * 1000); // Lưu mã OTP vào cache trong 5 phút

    if (this.configService.getOrThrow('app.nodeEnv', { infer: true }) === Environment.DEVELOPMENT) {
      await this.cache.set(rateLimitKey, currentCount + 1, this.WINDOW_SEC);
      return {
        message: 'OTP sent successfully',
        otpCode: otpCode,
      };
    }
    const { data } = await firstValueFrom(
      this.httpService
        .post(
          `${this.zaloConfig.zns_open_api_url}/message/template`,
          {
            phone: vietnamesePhone,
            template_id: this.zaloConfig.zns_template_id,
            template_data: { otp: otpCode },
            tracking_id: 'tracking_id', // Consider generating a unique tracking ID
          },
          {
            headers: {
              access_token: zaloConfig.accessToken,
              'Content-Type': 'application/json',
            },
          },
        )
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error('Error sending OTP via Zalo:', error.response?.data || error.message);
            throw new UnauthorizedException('Failed to send OTP via Zalo.');
          }),
        ),
    );
    if (data.error !== 0) {
      console.error('Error sending OTP via Zalo:', data);
      throw new UnauthorizedException('Failed to send OTP via Zalo.');
    }
    await this.cache.set(rateLimitKey, currentCount + 1, this.WINDOW_SEC);
    this.logger.log(`OTP sent successfully to ${vietnamesePhone}`);
  }

  /**
   * Kiểm tra trạng thái rate limit của số điện thoại (API test)
   */
  async checkOtpRateLimit(phone: string) {
    const rateLimitKey = createCacheKey(CacheKey.OTP_RATE_LIMIT, phone);
    const currentCount = (await this.cache.get<number>(rateLimitKey)) || 0;
    const MAX_OTP_REQUESTS = 3;
    const RATE_LIMIT_WINDOW_MINUTES = 60; // 1 giờ
    const remainingRequests = Math.max(0, MAX_OTP_REQUESTS - currentCount);
    const isLimited = currentCount >= MAX_OTP_REQUESTS;

    return {
      phone,
      currentCount,
      maxRequests: MAX_OTP_REQUESTS,
      remainingRequests,
      isLimited,
      rateLimitWindowMinutes: RATE_LIMIT_WINDOW_MINUTES,
      message: isLimited
        ? `Đã đạt giới hạn ${MAX_OTP_REQUESTS} lần gửi OTP. Vui lòng thử lại sau ${RATE_LIMIT_WINDOW_MINUTES} phút.`
        : `Còn ${remainingRequests}/${MAX_OTP_REQUESTS} lần gửi OTP.`,
    };
  }

  /**
   * Tìm token Zalo trong database
   */
  private async findZaloToken() {
    return this.db.query.zalo.findFirst({
      where: eq(zalo.appId, this.zaloConfig.app_id),
    });
  }

  private async createZaloToken(accessToken: string, refreshToken: string): Promise<void> {
    const existingZaloConfig = await this.findZaloToken();

    if (!existingZaloConfig) {
      const created = await this.db
        .insert(zalo)
        .values({
          appId: this.zaloConfig.app_id,
          appSecret: this.zaloConfig.app_secret,
          accessToken,
          refreshToken,
        })
        .returning()
        .then((res) => res[0]);
      if (!created) {
        this.logger.error('Failed to create Zalo token in the database.');
        throw new UnauthorizedException('Failed to create Zalo token.');
      }
      this.logger.log('Zalo token created in the database.');
    } else {
      const updated = await this.db
        .update(zalo)
        .set({ accessToken, refreshToken })
        .where(eq(zalo.appId, this.zaloConfig.app_id))
        .returning()
        .then((res) => res[0]);
      if (!updated) {
        this.logger.error('Failed to update Zalo token in the database.');
        throw new UnauthorizedException('Failed to update Zalo token.');
      }
      this.logger.log('Zalo token updated in the database.');
    }
  }

  async verifyUserRegistration(phone: string) {
    const existUser = await this.usersService.existsByPhone(phone);
    let user: User | null = null;
    let isRegistered = false;
    if (!existUser) {
      user = await this.db
        .insert(users)
        .values({
          phone: phone,
          provider: ProviderEnum.ZALO,
        })
        .returning()
        .then((res) => res[0]);
      isRegistered = true;
    } else {
      user = await this.db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .then((res) => res[0]);
    }
    return {
      user,
      isRegistered,
    };
  }

  async verifyOtp(reqDto: VerifyOtpReqDto) {
    const cacheKey = createCacheKey(CacheKey.OTP_VERIFICATION, reqDto.phone);
    const cacheOtp = await this.cache.get(cacheKey);
    console.log('cacheOtp', cacheOtp);
    if (Number(cacheOtp) != reqDto.otpCode) {
      throw new ValidationException(ErrorCode.Z005, HttpStatus.BAD_REQUEST);
    }

    const { user, isRegistered } = await this.verifyUserRegistration(reqDto.phone);

    if (!user) {
      throw new ValidationException(ErrorCode.U001, HttpStatus.NOT_FOUND);
    }
    if (user.isLocked) {
      throw new ValidationException(ErrorCode.U003, HttpStatus.FORBIDDEN);
    }
    //----------------------------------------------------------
    // - TODO: add role
    // - Kiểm tra nếu tài khoản  đã đăng ký cửa hàng thì sẽ trả về role là STORE
    //----------------------------------------------------------
    const baseRole = (await this.storeService.existStoreByUserId(user.id))
      ? RoleEnum.STORE
      : user.role;

    const tokens = await this.authService.createToken({
      role: baseRole,
      id: user.id,
      areaId: user.areaId,
    });

    return plainToInstance(VerifyZaloResDto, {
      isRegistered,
      userId: user.id,
      role: baseRole,
      ...tokens,
    });
  }

  async callbackFromZalo({ code, state }) {
    const app_id = this.zaloConfig.app_id;
    const app_secret = this.zaloConfig.app_secret;
    const oauth_url = this.zaloConfig.oauth_url;
    try {
      const response = await this.httpService.axiosRef.post(
        `${oauth_url}/v4/oa/access_token`,
        {
          code,
          app_id,
          grant_type: 'authorization_code',
          code_verifier: state,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            secret_key: app_secret,
          },
        },
      );
      // if (response.status !== 200 || response.data.error) {
      //   throw response.data;
      // }
      this.logger.log('Zalo token is created');
      await this.createZaloToken(response.data.access_token, response.data.refresh_token);
      return {
        message: 'Zalo token is created',
      };
    } catch (error) {
      this.logger.error('Error when get access token from Zalo', error);
      throw new UnauthorizedException(error.error_name ?? 'Unauthorized');
    }
  }
}
