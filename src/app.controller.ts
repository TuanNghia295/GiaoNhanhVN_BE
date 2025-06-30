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
  private async notifyNewOrderToDriverByTopic(topicName: string) {
    try {
      await this.admin.messaging().send({
        topic: topicName,
        notification: {
          title: 'Thông báo đơn hàng mới',
          body: 'Bạn có đơn hàng mới cần xử lý',
        },
        data: {
          title: 'Thông báo đơn hàng mới',
          body: 'Bạn có đơn hàng mới cần xử lý',
        },
        android: {
          ttl: 60 * 1000, // thời gian sống của thông báo trên Android
          priority: 'high',
          notification: {
            sound: 'alert', // âm thanh thông báo
          },
        },
        apns: {
          payload: {
            aps: {
              headers: {
                'apns-priority': '10', // ưu tiên cao
              },
              badge: 1, // tăng badge khi có thông báo mới
              sound: 'alert.caf', // âm thanh thông báo
            },
          },
        },
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  @ApiPublic()
  @Post('notify')
  async notify() {
    try {
      await this.notifyNewOrderToDriverByTopic('new-order');
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}
