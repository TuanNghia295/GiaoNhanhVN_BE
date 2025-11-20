import { AuthService } from '@/api/auth/auth.service';
import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import { AuthGuard } from '@/guards/auth.guard';
import { RoleGuard } from '@/guards/role.guard';
import { AccessControlService } from '@/shared/access-control.service';
import setupSwagger from '@/utils/setup-swagger';
import {
  ClassSerializerInterceptor,
  HttpStatus,
  RequestMethod,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filter/global-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService<AllConfigType>);
  const reflector = app.get(Reflector);
  const isProduction = configService.get('app.nodeEnv', { infer: true }) === Environment.PRODUCTION;

  // Use global prefix if you don't have subdomain
  app.setGlobalPrefix(configService.getOrThrow('app.apiPrefix', { infer: true }), {
    exclude: [
      {
        path: 'health',
        method: RequestMethod.GET,
      },
      {
        path: 'zalo/callback',
        method: RequestMethod.GET,
      },
    ],
  });

  app.enableCors();

  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) => {
        return new UnprocessableEntityException(errors);
      },
    }),
  );

  app.useGlobalGuards(new AuthGuard(reflector, app.get(AuthService)));
  app.useGlobalGuards(
    new RoleGuard(reflector, app.get(AccessControlService), app.get(ConfigService)),
  );

  //************************************************************
  // Transform response to class instance
  //************************************************************

  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  //************************************************************
  // [Enable/Disable] Swagger UI
  //************************************************************
  if (!isProduction) {
    setupSwagger(app);
  }
  app.set('trust proxy', 'loopback'); // Trust requests from the loopback address

  await app.listen(configService.getOrThrow('app.port', { infer: true }), async () => {
    console.info(`
    ======================================================================================================
        Name: [${configService.getOrThrow('app.name', { infer: true })}] - Port: [${configService.getOrThrow('app.port', { infer: true })}] - Environment: [${configService.getOrThrow('app.nodeEnv', { infer: true })}]
        ${!isProduction ? `Swagger UI: ${(await app.getUrl()).replace(`[::1]`, `localhost`).trim()}/api-docs` : 'Swagger UI: Disabled'}
    ======================================================================================================
  `);
  });
}

void bootstrap();
