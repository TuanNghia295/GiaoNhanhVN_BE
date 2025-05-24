// common/guards/system-enabled.guard.ts
import { SettingsService } from '@/api/settings/settings.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SystemEnabledGuard implements CanActivate {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return true;
    // const request = context.switchToHttp().getRequest();
    // const user = request.user as User;
    // const isEnabled = await this.settingsService.isSystemEnabled();
    //
    // if (isEnabled) return true;
    //
    //
    // throw new ForbiddenException('System is currently disabled');
  }
}
