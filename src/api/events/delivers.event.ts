import { DeliverGateway } from '@/api/gateways/deliver.gateway';
import { DRIZZLE } from '@/database/global';
import { delivers } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../../firebase/firebase.module';

@Injectable()
export class DeliversEvent {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(FIREBASE_ADMIN) private readonly admin: admin.app.App,
    private readonly deliverGateway: DeliverGateway,
  ) {}

  private readonly logger = new Logger(DeliversEvent.name);

  @OnEvent('deliver.locked', { async: true })
  async onUserLocked(deliver: typeof delivers.$inferSelect) {
    this.logger.log(`Deliver locked: ${deliver.id}`);

    if (deliver.fcmToken) {
      await this.admin.messaging().send({
        token: deliver.fcmToken,
        notification: {
          title: 'Tài khoản bị khóa',
          body: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với quản trị viên để biết thêm chi tiết.',
        },
        data: {
          title: 'Tài khoản bị khóa',
          body: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với quản trị viên để biết thêm chi tiết.',
        },
      });
    }
    //----------------------------------------------------------
    // Emit an event to the deliver's socket connection
    //-----------------------------------------------------------
    this.deliverGateway.server.to(String(deliver.id)).emit('account-locked');
  }
}
