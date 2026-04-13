import { DeliverGateway } from '@/api/gateways/deliver.gateway';
import { ManagerGateway } from '@/api/gateways/manager.gateway';
import { UserGateway } from '@/api/gateways/user.gateway';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  providers: [UserGateway, ManagerGateway, DeliverGateway],
  exports: [UserGateway, ManagerGateway, DeliverGateway],
})
export class GatewaysModule {}
