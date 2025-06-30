import { CacheKey } from '@/constants/cache.constant';
import { ApiPublic } from '@/decorators/http.decorators';
import { createCacheKey } from '@/utils/cache.util';
import { buildTopicMessage } from '@/utils/firebase.util';
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

  // mỗi giây
  // @Cron('*/1 * * * * *')
  // async handleCron() {
  //   console.log('Called every second');
  //   // You can add any logic you want to execute every second here
  //   await this.notifyNewOrderToDriverByTopic('new-order');
  // }

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
      await this.admin.messaging().send(
        buildTopicMessage({
          topic: topicName,
          title: 'Bạn có một đơn hàng mới',
          body: 'Có một đơn hàng mới cần giao, hãy kiểm tra ngay',
          sound: {
            ios: 'alert.caf',
            android: 'alert',
          },
        }),
      );
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
