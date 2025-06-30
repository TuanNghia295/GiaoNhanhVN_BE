import { DeliversService } from '@/api/delivers/delivers.service';
import { DeliverGateway } from '@/api/gateways/deliver.gateway';
import { UserGateway } from '@/api/gateways/user.gateway';
import { StoresService } from '@/api/stores/stores.service';
import { Order, RoleEnum } from '@/database/schemas';
import { buildMulticastMessage, buildTopicMessage } from '@/utils/firebase.util';
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
    private readonly storesService: StoresService,
    private readonly userGateway: UserGateway,
  ) {}

  private readonly logger = new Logger(OrdersEvent.name);

  private async notifyNewOrderToStoreByFcmToken(fcmTokens: string[]) {
    //--------------------------------------------------------
    const validFcmTokens = fcmTokens.filter(Boolean);
    if (validFcmTokens.length === 0) return;

    try {
      const message = buildMulticastMessage({
        tokens: fcmTokens,
        title: 'Bạn có một đơn hàng mới',
        body: 'Có một đơn hàng mới cần giao, hãy kiểm tra ngay',
        sound: {
          ios: 'alert_shipper.caf',
          android: 'alert_shipper',
        },
      });

      const response = await this.firebase.messaging().sendEachForMulticast(message);
      this.logger.log(`Successfully sent FCM notification to ${response.successCount} tokens`);
    } catch (error) {
      this.logger.error('Error sending FCM notification', error);
    }
  }

  private async notifyNewOrderToDriverByTopic(topicName: string) {
    try {
      await this.firebase.messaging().send(
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
      this.logger.error('Error sending FCM notification', error);
    }
  }

  private async emitSocketToDrivers(ids: string[], order: Order) {
    //--------------------------------------------------------
    // Chỉ gửi socket chi shipper trong khu vực đó
    //--------------------------------------------------------
    this.deliverGateway.server.to(ids).emit('refresh-order', order);
  }

  @OnEvent('order.created')
  async onOrderCreated(order: Order) {
    console.log(`Order created with ID: ${order.id}`);
    //----------------------------------------------
    // Lấy tất cả các deliver actived = true và ở trong khu vực
    //-----------------------------------------------
    const activeDrivers = await this.deliversService.selectFcmTokenByAreaId(order.areaId);
    const store = await this.storesService.selectFcmTokenById(order.storeId);

    this.logger.log(`Found ${activeDrivers.length} drivers in area ${order.areaId}`);

    const fcmTokens = activeDrivers.map((driver) => driver.fcmToken);
    await Promise.all([
      this.notifyNewOrderToStoreByFcmToken([store?.fcmToken]),
      // this.notifyNewOrderToDriverByTopic('new-order'),
    ]);
    this.logger.log(`FCM sent to ${fcmTokens.length} drivers`);
    // Emit socket to all drivers in the area
    const driverIds = activeDrivers.map((driver) => String(driver.id));
    await this.emitSocketToDrivers(driverIds, order);
  }

  @OnEvent('order.updated_status')
  async onOrderUpdatedStatus(order: Order) {
    console.log(`Order updated status with ID: ${order.id}`);
    // Add your logic here
    this.userGateway.server.to(String(order.id)).emit('change-order-status', order);
  }

  @OnEvent('order.canceled')
  public async onOrderCanceled({ updatedOrder, role }: { updatedOrder: Order; role: RoleEnum }) {
    this.logger.log(`Order canceled with ID: ${updatedOrder.id} by role: ${role}`);
    switch (role) {
      case RoleEnum.ADMIN:
      case RoleEnum.MANAGEMENT:
        this.deliverGateway.server
          .to(String(updatedOrder.deliverId))
          .emit('order-canceled-by-admin', updatedOrder);
        break;
      case RoleEnum.USER: {
        //-----------------------------------------------
        // Lấy tất cả các deliver actived = true và ở trong khu vực
        //-----------------------------------------------
        const activeDrivers = await this.deliversService.selectFcmTokenByAreaId(
          updatedOrder.areaId,
        );
        const driverIds = activeDrivers.map((driver) => String(driver.id));
        if (driverIds.length > 0) {
          // Emit socket to all drivers in the area
          this.deliverGateway.server.to(driverIds).emit('refresh-order', updatedOrder);
        }

        //---------------------------------------------------
        // Cập nhật trạng thái đơn hàng cho user
        //---------------------------------------------------
        this.userGateway.server
          .to(String(updatedOrder.userId))
          .emit('order-cancel-by-user', updatedOrder);
        break;
      }
    }
  }
}
