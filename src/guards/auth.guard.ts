import { AuthService } from '@/api/auth/auth.service';
import { IS_AUTH_OPTIONAL, IS_PUBLIC } from '@/constants/app.constant';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    // If the route is public, allow access
    if (isPublic) return true;

    const isAuthOptional = this.reflector.getAllAndOverride<boolean>(
      IS_AUTH_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );
    console.log('isAuthOptional', isAuthOptional);

    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const accessToken = this.extractTokenFromHeader(request);

    // If authentication is optional and no token is provided, allow access
    if ((isAuthOptional && !accessToken) || accessToken === 'undefined') {
      return true;
    }

    // If no token is provided and authentication is not optional, deny access
    if (!accessToken) {
      throw new UnauthorizedException();
    }

    try {
      // Verify the token
      request['user'] = await this.authService.verifyAccessToken(accessToken);
      return true;
    } catch (error) {
      console.log(error);
      // If token verification fails, deny access
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
