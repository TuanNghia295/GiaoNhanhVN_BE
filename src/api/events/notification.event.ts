import { UserGateway } from '@/api/gateways/user.gateway';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationEvent {
  constructor(private readonly userGateway: UserGateway) {}

  private readonly logger = new Logger(NotificationEvent.name);

  @OnEvent('notification.created')
  async handleNotificationCreate({
    notificationId,
    userIds,
  }: {
    notificationId: number;
    userIds: string[];
  }) {
    this.logger.log(`Handling notification creation for ID: ${notificationId}`);
    console.log('userIds', userIds);
    if (userIds.length > 0) {
      this.userGateway.server.to(userIds).emit('notification.create');
    }
  }
}
