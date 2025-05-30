// ua.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class UserAgentMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const ua = req.headers['user-agent'] || '';
    const parser = new UAParser(ua);
    req['deviceInfo'] = parser.getResult();
    next();
  }
}
