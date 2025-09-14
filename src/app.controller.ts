import { OrdersService } from '@/api/orders/orders.service';
import { ApiPublic } from '@/decorators/http.decorators';
import { GoongService } from '@/shared/goong.service';
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
    private readonly goongService: GoongService,
    private orderService: OrdersService, // Assuming you have an order service for handling orders
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
  @Get('test-calculate')
  async testCalculate() {
    const sortDistances = [
      {
        id: 1281,
        minDistance: 0,
        maxDistance: 1,
        rate: 10000,
        serviceFeeId: 133,
      },
      {
        id: 1282,
        minDistance: 1,
        maxDistance: 2,
        rate: 3000,
        serviceFeeId: 133,
      },
      {
        id: 1283,
        minDistance: 2,
        maxDistance: 3,
        rate: 5000,
        serviceFeeId: 133,
      },
      {
        id: 1284,
        minDistance: 3,
        maxDistance: 4,
        rate: 5000,
        serviceFeeId: 133,
      },
      {
        id: 1285,
        minDistance: 4,
        maxDistance: 5,
        rate: 5000,
        serviceFeeId: 133,
      },
      {
        id: 1286,
        minDistance: 5,
        maxDistance: 6,
        rate: 5000,
        serviceFeeId: 133,
      },
      {
        id: 1287,
        minDistance: 6,
        maxDistance: 7,
        rate: 5000,
        serviceFeeId: 133,
      },
      {
        id: 1288,
        minDistance: 7,
        maxDistance: 8,
        rate: 5000,
        serviceFeeId: 133,
      },
      {
        id: 1289,
        minDistance: 8,
        maxDistance: 9,
        rate: 5000,
        serviceFeeId: 133,
      },
      {
        id: 1290,
        minDistance: 9,
        maxDistance: 10,
        rate: 12000,
        serviceFeeId: 133,
      },
    ];

    return await this.orderService.calculateDistanceFee(
      1.5, // serviceFeeId
      sortDistances as any, // distance in km
      0,
    );
  }

  @ApiPublic()
  @Get('distance')
  async getDistance() {
    const response = await this.goongService.getDirection({
      origin: '10.633287269384732, 107.72738040985809',
      destination: '10.661207380024518, 107.77232834205587',
      vehicle: 'car',
    });
    console.log('Distance response:', response);
    return response;
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
    return this.orderService.createUniqueCode();
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
