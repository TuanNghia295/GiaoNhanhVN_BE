import { AreasModule } from '@/api/areas/areas.module';
import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [AreasModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
