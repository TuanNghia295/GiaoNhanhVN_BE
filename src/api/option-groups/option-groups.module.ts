import { Module } from '@nestjs/common';
import { OptionGroupsService } from './option-groups.service';

@Module({
  providers: [OptionGroupsService],
  exports: [OptionGroupsService],
})
export class OptionGroupsModule {}
