import { DeliversService } from '@/api/delivers/delivers.service';
import { DeliverGateway } from '@/api/gateways/deliver.gateway';
import { UserGateway } from '@/api/gateways/user.gateway';
import { Order } from '@/database/schemas';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../../firebase/firebase.module';

@Injectable()
export class OrdersEvent {
  constructor(
    private readonly deliversService: DeliversService,
    @Inject(FIREBASE_ADMIN) private readonly firebase: admin.app.App,
    private readonly deliverGateway: DeliverGateway,
    private readonly userGateway: UserGateway,
  ) {}

  private readonly logger = new Logger(OrdersEvent.name);

  private async notifyDriversByFCM(tokens: string[]) {
    const validTokens = tokens.filter((t) => !!t);
    if (!validTokens.length) return;
    try {
      await this.firebase.messaging().sendEachForMulticast({
        tokens: validTokens,
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
      this.logger.error('Error sending FCM notification', error);
    }
  }

  private async emitSocketToDrivers(ids: string[], order: Order) {
    this.deliverGateway.server.to(ids).emit('refresh-order', order);
  }

  @OnEvent('order.created')
  async onOrderCreated(order: Order) {
    console.log(`Order created with ID: ${order.id}`);
    //----------------------------------------------
    // Lấy tất cả các deliver actived = true và ở trong khu vực
    //-----------------------------------------------
    const drivers = await this.deliversService.selectFcmTokenByAreaId(
      order.areaId,
    );

    if (drivers.length > 0) {
      this.logger.log(
        `Found ${drivers.length} drivers in area ${order.areaId}`,
      );
      const driverIds = drivers.map((driver) => String(driver.id));
      const fcmTokens = drivers.map((driver) => driver.fcmToken);

      await this.notifyDriversByFCM(fcmTokens);
      this.logger.log(`FCM sent to ${fcmTokens.length} drivers`);
      await this.emitSocketToDrivers(driverIds, order);
    }
  }

  @OnEvent('order.updated_status')
  async onOrderUpdatedStatus(order: Order) {
    console.log(`Order updated status with ID: ${order.id}`);
    // Add your logic here
    this.deliverGateway.server
      .to(String(order.deliverId))
      .emit('order-updated-status', order);
  }

  @OnEvent('order.canceled')
  public async onOrderCanceled(order: Order) {
    this.logger.log(`Order canceled with ID: ${order.id}`);
    this.userGateway.server
      .to(String(order.id))
      .emit('order-cancel-by-deliver');
    // Add your logic here
    // this.userGateway.server.to(String(orderId)).emit('order-canceled', orderId);
  }
}
