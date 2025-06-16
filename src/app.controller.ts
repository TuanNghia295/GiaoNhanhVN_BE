import { CacheKey } from '@/constants/cache.constant';
import { ApiPublic } from '@/decorators/http.decorators';
import { createCacheKey } from '@/utils/cache.util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, Inject, Post } from '@nestjs/common';
import { Cache } from 'cache-manager'; // Replace with actual cache manager type
import * as admin from 'firebase-admin';
import { AppService } from './app.service';
import { FIREBASE_ADMIN } from './firebase/firebase.module';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(FIREBASE_ADMIN) private readonly admin: admin.app.App,
    @Inject(CACHE_MANAGER) private readonly cache: Cache, // Replace with actual type
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiPublic()
  @Get('/debug-sentry')
  getError() {
    throw new Error('My first Sentry error!');
  }

  @ApiPublic()
  @Get('redis')
  async getRedis() {
    await this.cache.set(
      createCacheKey(CacheKey.SESSION_ORDER, '123'),
      123,
      60 * 60, // Cache for 1 hour
    );
  }

  @ApiPublic()
  @Post('notify')
  async notify() {
    try {
      await this.admin.messaging().sendEachForMulticast({
        tokens: [
          'fjoDnfJdRlql9zExUarnJJ:APA91bEfaKgcYt-UXP2fn11RHKOptgtRbgF4fRlWKbUKoXa3wFyEKh2EGMBsLZRAurcTypOXdIbuqdQeJVu8TwIJL59my-Z0j6EAeoA0NWIn3UghJ9NGVxQ',
        ],
        notification: {
          title: 'Bạn có một đơn hàng mới',
          body: 'Có một đơn hàng mới cần giao, hãy kiểm tra ngay',
        },
        data: {
          title: 'Bạn có một đơn hàng mới',
          body: 'Có một đơn hàng mới cần giao, hãy kiểm tra ngay',
          sound: 'alert.caf',
        },
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}
