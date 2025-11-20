import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import * as requestIp from 'request-ip';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const clientIp = requestIp.getClientIp(req);
    console.log('clientIp', clientIp);
    return clientIp || req.ip; // fallback nếu request-ip không tìm được
  }
}
