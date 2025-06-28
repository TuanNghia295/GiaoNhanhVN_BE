import { ManagerGateway } from '@/api/gateways/manager.gateway';
import { UserGateway } from '@/api/gateways/user.gateway';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class StoreRequestsEvent {
  private readonly logger = new Logger(StoreRequestsEvent.name);

  constructor(
    private readonly managerGateway: ManagerGateway,
    private readonly userGateway: UserGateway,
  ) {}

  @OnEvent('store-requests.created')
  onStoreRequestsCreated(payload: { userId: number; areaId: number }) {
    this.logger.log(
      `Store request created for userId: ${payload.userId}, areaId: ${payload.areaId}`,
    );
    //! sau sử lại chỉ cần gửi cho admin khu vực và admin tổng thôi
    // Emit the event to the user gateway
    this.managerGateway.server.emit('update-store-request');
  }

  @OnEvent('store-requests.approved')
  onStoreRequestsApproved(payload: { userId: number; areaId: number }) {
    this.logger.log(
      `Store request approved for userId: ${payload.userId}, areaId: ${payload.areaId}`,
    );
    //--------------------------------------------------
    // Refresh the store request list for all managers
    //---------------------------------------------------
    this.userGateway.server.emit('update-store-request');

    //---------------------------------------------------
    // Notify the user that their store request has been approved
    //---------------------------------------------------
    this.userGateway.server.to(String(payload.userId)).emit('store-require-verified');
  }
}
