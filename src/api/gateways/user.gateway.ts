import { Injectable, Logger } from '@nestjs/common';
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: 'users' })
@Injectable()
export class UserGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(UserGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.log(`${UserGateway.name} dependencies Initialized`);
  }

  @SubscribeMessage('connect')
  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.debug(`new client (user) connected: ${client.id}`);
  }

  @SubscribeMessage('disconnect')
  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.debug(`client (user) disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { userId }: { userId: string },
  ) {
    this.logger.debug(`user client ${client.id} join room: ${userId}`);
    await client.join(userId?.toString());
    this.server.to(userId.toString()).emit('join-room', 'join room success');
  }

  @SubscribeMessage('account-locked')
  handleAccountLocked(userId: string) {
    this.server.to(userId.toString()).emit('account-locked', 'account has been locked');
    this.logger.debug(`${userId} account has been locked`);
  }

  @SubscribeMessage('store-require-verified')
  handleAccountStoreRequireVerify(userId: string, status: string) {
    this.server.to(userId.toString()).emit('store-require-verified', {
      message: 'account store require verified',
      status,
    });
    this.logger.debug(`${userId} store require is verified, status: ${status}`);
  }

  @SubscribeMessage('join-room-order')
  async handleJoinRoomOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() { orderId }: { orderId: string },
  ) {
    this.logger.debug(`user client ${client.id} join room order: ${orderId}`);
    await client.join(orderId?.toString());
    this.server.to(orderId.toString()).emit('join-room-order', 'join room order success');
  }

  @SubscribeMessage('change-order-status')
  handleChangeOrderStatus(orderId: string, @MessageBody() data: string) {
    this.server.to(orderId.toString()).emit('change-order-status', data);
    this.logger.debug(`order ${orderId} has been changed status`);
  }

  @SubscribeMessage('order-accepted')
  handleOrderAccepted(orderId: string, deliverId: string) {
    this.server.to(orderId.toString()).emit('order-accepted', 'order accepted');
    this.logger.debug(`order ${orderId} has been accepted by: ${deliverId}`);
  }

  @SubscribeMessage('order-cancel-by-out-time')
  handleOrderCancelByOutTime(orderId: string) {
    this.server
      .to(orderId.toString())
      .emit('order-cancel-by-out-time', 'order canceled by out time');
    this.logger.debug(`order ${orderId} has been canceled by out time`);
  }

  @SubscribeMessage('order-cancel-by-admin')
  handleOrderCancelByAdmin(orderId: string) {
    this.server.to(orderId.toString()).emit('order-cancel-by-admin', 'order canceled by admin');
    this.logger.debug(`order ${orderId} has been canceled by admin`);
  }

  @SubscribeMessage('order-cancel-by-deliver')
  handleOrderCancelByDeliver(orderId: string) {
    this.server.to(orderId.toString()).emit('order-cancel-by-deliver', 'order canceled by deliver');
    this.logger.debug(`order ${orderId} has been canceled by deliver`);
  }

  @SubscribeMessage('order-cancel-by-system')
  handleOrderCancelBySystem(orderId: string) {
    this.server.to(orderId.toString()).emit('order-cancel-by-system', 'order canceled by system');
    this.logger.debug(`order ${orderId} has been canceled by system`);
  }
}
