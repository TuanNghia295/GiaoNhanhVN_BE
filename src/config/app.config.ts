import { AppConfig } from '@/config/app-config.type';
import { Environment } from '@/constants/app.constant';
import validateConfig from '@/utils/validate-config';
import { registerAs } from '@nestjs/config';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
} from 'class-validator';

class EnvironmentVariablesValidator {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsString()
  @IsOptional()
  APP_NAME: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  APP_URL: string;

  @IsBoolean()
  @IsOptional()
  APP_DEBUG: boolean;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  PORT: number;
  @IsString()
  @IsOptional()
  API_PREFIX: string;

  @IsString()
  @Matches(
    /^(true|false|\*|([\w]+:\/\/)?([\w.-]+)(:[0-9]+)?)?(,([\w]+:\/\/)?([\w.-]+)(:[0-9]+)?)*$/,
  )
  @IsOptional()
  APP_CORS_ORIGIN: string;
}

export default registerAs<AppConfig>('app', () => {
  console.info(`
    ======================================================================================================
        Register AppConfig from environment variables
    ======================================================================================================
  `);
  validateConfig(process.env, EnvironmentVariablesValidator);

  const port = process.env.APP_PORT
    ? parseInt(process.env.APP_PORT, 10)
    : process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : 3000;

  return {
    nodeEnv: process.env.NODE_ENV || Environment.DEVELOPMENT,
    name: process.env.APP_NAME || 'app',
    port,
    debug: process.env.APP_DEBUG === 'true',
    url: process.env.APP_URL || `http://localhost:${port}`,
    apiPrefix: process.env.API_PREFIX || 'api',
    corsOrigin: getCorsOrigin(),
  };
});

function getCorsOrigin() {
  const corsOrigin = process.env.APP_CORS_ORIGIN;
  if (corsOrigin === 'true') return true;
  if (corsOrigin === '*') return '*';
  if (!corsOrigin || corsOrigin === 'false') return false;

  return corsOrigin.split(',').map((origin) => origin.trim());
}
