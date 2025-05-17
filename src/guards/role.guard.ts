import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { SettingsService } from '@/api/settings/settings.service';
import { ROLE_KEY } from '@/constants/app.constant';
import { RoleEnum } from '@/database/schemas';
import { AccessControlService } from '@/shared/access-control.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private settingsService: SettingsService,
    private accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleEnum[]>(
      ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<
      Request & {
        user: JwtPayloadType;
      }
    >();
    console.log('user', user);
    for (const role of requiredRoles) {
      const result = this.accessControlService.isAuthorized({
        requiredRole: role,
        currentRole: user?.role,
      });
      console.log('result', result);
      if (result) {
        return true;
      }
    }

    return false;
  }
}
