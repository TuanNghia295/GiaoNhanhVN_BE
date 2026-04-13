import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { GoongService } from './goong.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [AccessControlService, GoongService],
  exports: [AccessControlService, GoongService],
})
export class SharedModule {}
