import { DeliversService } from '@/api/delivers/delivers.service';
import { DeliverGateway } from '@/api/gateways/deliver.gateway';
import { UserGateway } from '@/api/gateways/user.gateway';
import { StoresService } from '@/api/stores/stores.service';
import { Order, RoleEnum } from '@/database/schemas';
import { buildMulticastMessage } from '@/utils/firebase.util';
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

  private async notifyNewOrderByFCM(tokens: string[]) {
    const validTokens = tokens.filter((t) => !!t);
    if (!validTokens.length) return;
    try {
      await this.firebase
        .messaging()
        .sendEachForMulticast(buildMulticastMessage(validTokens, 'NEW_ORDER'));
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
    const activeDrivers = await this.deliversService.selectFcmTokenByAreaId(
      order.areaId,
    );
    const store = await this.storesService.selectFcmTokenById(order.storeId);

    if (activeDrivers.length > 0) {
      this.logger.log(
        `Found ${activeDrivers.length} drivers in area ${order.areaId}`,
      );

      const fcmTokens = [
        ...activeDrivers.map((driver) => driver.fcmToken),
        ...(store?.fcmToken ? [store.fcmToken] : []), // Thêm fcmToken của cửa hàng nếu có
      ];
      await this.notifyNewOrderByFCM(fcmTokens);
      this.logger.log(`FCM sent to ${fcmTokens.length} drivers`);
      // Emit socket to all drivers in the area
      const driverIds = activeDrivers.map((driver) => String(driver.id));
      await this.emitSocketToDrivers(driverIds, order);
    }
  }

  @OnEvent('order.updated_status')
  async onOrderUpdatedStatus(order: Order) {
    console.log(`Order updated status with ID: ${order.id}`);
    // Add your logic here
    this.userGateway.server
      .to(String(order.id))
      .emit('change-order-status', order);
  }

  @OnEvent('order.canceled')
  public async onOrderCanceled({
    updatedOrder,
    role,
  }: {
    updatedOrder: Order;
    role: RoleEnum;
  }) {
    this.logger.log(
      `Order canceled with ID: ${updatedOrder.id} by role: ${role}`,
    );
    switch (role) {
      case RoleEnum.ADMIN:
      case RoleEnum.MANAGEMENT:
        this.deliverGateway.server
          .to(String(updatedOrder.deliverId))
          .emit('order-canceled-by-admin', updatedOrder);
        break;
      case RoleEnum.USER:
        this.userGateway.server
          .to(String(updatedOrder.userId))
          .emit('order-cancel-by-user', updatedOrder);
        break;
    }
  }
}
