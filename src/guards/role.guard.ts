import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { AllConfigType } from '@/config/config.type';
import { Environment, ROLE_KEY } from '@/constants/app.constant';
import { RoleEnum } from '@/database/schemas';
import { AccessControlService } from '@/shared/access-control.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessControlService: AccessControlService,
    private configService: ConfigService<AllConfigType>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleEnum[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<Request & { user: JwtPayloadType }>();
    const { user, url, method } = request;

    const isDev =
      this.configService.get('app.nodeEnv', { infer: true }) === Environment.DEVELOPMENT;

    if (isDev) {
      console.log(
        `🛡️ [RoleGuard] ${method} ${url} | User: ${user?.id} | Role: ${user?.role} | Required: ${requiredRoles.join(', ')}`,
      );
    }

    for (const role of requiredRoles) {
      const allowed = this.accessControlService.isAuthorized({
        requiredRole: role,
        currentRole: user?.role,
      });

      if (isDev) {
        console.log(`   🔍 Checking "${role}": ${allowed ? '✅ GRANTED' : '❌ DENIED'}`);
      }

      if (allowed) return true;
    }

    if (isDev) {
      console.log('🚫 Access blocked: insufficient role');
    }

    return false;
  }
}
