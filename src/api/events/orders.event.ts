import { DeliversService } from '@/api/delivers/delivers.service';
import { DeliverGateway } from '@/api/gateways/deliver.gateway';
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
  ) {}

  private readonly logger = new Logger(OrdersEvent.name);

  @OnEvent('order.created')
  async onOrderCreated(order: Order) {
    console.log(`Order created with ID: ${order.id}`);
    //----------------------------------------------
    // Lấy tất cả các deliver actived = true và ở trong khu vực
    //-----------------------------------------------
    const drivers = await this.deliversService.getAllDeliveriesInArea(
      order.areaId,
    );

    if (drivers.length > 0) {
      this.logger.log(
        `Found ${drivers.length} drivers in area ${order.areaId}`,
      );
      const ids = drivers.map((driver) => String(driver.id));
      const fcmTokens = drivers.map((driver) => driver.fcmToken);

      try {
        await this.firebase.messaging().sendEachForMulticast({
          tokens: fcmTokens,
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
        this.logger.error('Error sending notification', error);
      }
      this.deliverGateway.server.to(ids).emit('refresh-order', order);
    }
  }

  @OnEvent('order.updated')
  async onOrderUpdated(orderId: number) {
    console.log(`Order updated with ID: ${orderId}`);
    // Add your logic here
  }

  public async onOrderDeleted(orderId: number) {
    console.log(`Order deleted with ID: ${orderId}`);
    // Add your logic here
  }
}
