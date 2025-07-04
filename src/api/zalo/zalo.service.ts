import { AllConfigType } from '@/config/config.type';

import { AuthService } from '@/api/auth/auth.service';
import { StoresService } from '@/api/stores/stores.service';
import { VerifyZaloResDto } from '@/api/zalo/dto/verify-otp.res.dto';
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
import { HttpStatus, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
export class ZaloService {
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

  async sendZaloOtp(phone: string) {
    const zaloConfig = await this.findZaloToken();
    if (!zaloConfig?.accessToken) {
      throw new UnauthorizedException('Zalo access token is not available.');
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
    await this.cache.set(cacheKey, otpCode, 5 * 60 * 1000); // Lưu mã OTP vào cache trong 5 phút

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
      throw new UnauthorizedException('Failed to send OTP via Zalo.');
    }

    this.logger.log(`OTP sent successfully to ${vietnamesePhone}`);
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
}
