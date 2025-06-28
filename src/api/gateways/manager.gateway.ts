import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';

@WebSocketGateway({ cors: true, namespace: 'admin' })
export class ManagerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ManagerGateway.name);

  constructor(private jwtService: JwtService) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(@ConnectedSocket() client: Socket) {
    const accessToken = client.handshake.query.accessToken as string | undefined;
    this.logger.debug(`client (admin) connect: ${client.id}`);
    if (accessToken) {
      const decoded = this.jwtService.decode(accessToken) as JwtPayloadType;
      if (decoded) {
        this.logger.debug(`client (admin) join: ${decoded.id}`);
        await client.join(String(decoded.id));
        client.data = decoded;
      }
    }
  }

  async handleDisconnect(
    @ConnectedSocket()
    client: Socket & {
      data: JwtPayloadType;
    },
  ) {
    this.logger.debug(`client (admin) leave: ${client.data.id}`);
    await client.leave(String(client.data.id));
  }

  @SubscribeMessage('update-store-request')
  handleUpdateStoreRequest() {
    this.logger.debug(`admin client update store request`);
    this.server.emit('update-store-request', 'admin get update store request');
  }
}
