import { StoresModule } from '@/api/stores/stores.module';
import { UsersModule } from '@/api/users/users.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ZaloController } from './zalo.controller';
import { ZaloService } from './zalo.service';

@Module({
  imports: [HttpModule, UsersModule, StoresModule],
  controllers: [ZaloController],
  providers: [ZaloService],
})
export class ZaloModule {}
