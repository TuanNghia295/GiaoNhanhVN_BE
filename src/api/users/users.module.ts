import { StoresModule } from '@/api/stores/stores.module';
import { UsersController } from '@/api/users/users.controller';
import { UsersService } from '@/api/users/users.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [StoresModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
