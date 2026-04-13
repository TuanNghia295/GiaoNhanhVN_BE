import { UserGateway } from '@/api/gateways/user.gateway';
import { DRIZZLE } from '@/database/global';
import { users } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class UsersEvent {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly userGateway: UserGateway,
  ) {}

  private readonly logger = new Logger(UsersEvent.name);

  @OnEvent('user.locked', { async: true })
  async onUserLocked(user: typeof users.$inferSelect) {
    this.logger.log(`User with ID ${user.id} has been locked.`);

    //----------------------------------------------------------
    // Emit an event to the user via WebSocket
    //-----------------------------------------------------------
    this.userGateway.server.to(String(user.id)).emit('account-locked');
  }
}
