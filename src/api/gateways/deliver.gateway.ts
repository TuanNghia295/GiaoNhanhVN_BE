import { Logger } from '@nestjs/common';
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

@WebSocketGateway({ cors: true, namespace: 'delivers' })
export class DeliverGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DeliverGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.log(`${DeliverGateway.name} dependencies Initialized`);
  }

  @SubscribeMessage('connect')
  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.debug(`new client (deliver) connected: ${client.id}`);
  }

  @SubscribeMessage('disconnect')
  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.debug(`client (deliver) disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { deliverId }: { deliverId: string },
  ) {
    this.logger.debug(`deliver client ${client.id} join room: ${deliverId}`);
    await client.join(deliverId.toString());
  }

  onRefreshOrder() {
    this.server.emit('refresh-order', 'refresh your order');
    this.logger.debug('All deliver need refresh his/her order');
  }

  @SubscribeMessage('refresh-order')
  handleDeliverRefreshOrder(deliverId: string) {
    this.server.to(deliverId.toString()).emit('refresh-order', 'refresh your order');
    this.logger.debug(`${deliverId} need refresh his/her order`);
  }

  @SubscribeMessage('order-cancel-by-user')
  handleOrderCancelByUser(deliverId: string) {
    this.server.to(deliverId.toString()).emit('order-cancel-by-user', 'order canceled by user');
    this.logger.debug(`${deliverId} need refresh his/her order`);
  }

  @SubscribeMessage('order-cancel-by-admin')
  handleOrderCancelByAdmin(deliverId: string) {
    this.server.to(deliverId.toString()).emit('order-cancel-by-admin', 'order canceled by admin');
    this.logger.debug(`${deliverId} need refresh his/her order`);
  }

  @SubscribeMessage('account-locked')
  handleAccountLocked(deliverId: string) {
    this.server.to(deliverId.toString()).emit('account-locked', 'account has been locked');
    this.logger.debug(`${deliverId} account has been locked`);
  }
}
