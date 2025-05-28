import { DeliverGateway } from '@/api/gateways/deliver.gateway';
import { DRIZZLE } from '@/database/global';
import { delivers } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { buildMulticastMessage } from '@/utils/firebase.util';
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
  async onDeliverLocked(deliver: typeof delivers.$inferSelect) {
    this.logger.log(`User with ID ${deliver.id} has been locked.`);

    //----------------------------------------------------------
    // Emit an event to the user via WebSocket
    //-----------------------------------------------------------
    this.deliverGateway.server.to(String(deliver.id)).emit('account-locked');
  }

  @OnEvent('deliver.locked', { async: true })
  async onUserLocked(deliver: typeof delivers.$inferSelect) {
    this.logger.log(`Deliver locked: ${deliver.id}`);

    if (deliver.fcmToken) {
      try {
        await this.admin
          .messaging()
          .sendEachForMulticast(
            buildMulticastMessage([deliver.fcmToken], 'LOCK_ACCOUNT'),
          );
      } catch (error) {
        this.logger.error('Error sending FCM notification', error);
      }
    }
    //----------------------------------------------------------
    // Emit an event to the deliver's socket connection
    //-----------------------------------------------------------
    this.deliverGateway.server.to(String(deliver.id)).emit('account-locked');
  }
}
