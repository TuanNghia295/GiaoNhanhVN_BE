import { registerAs } from '@nestjs/config';

import { RedisConfig } from '@/cache/config/redis-config.type';
import validateConfig from '@/utils/validate-config';
import { IsNotEmpty, IsString } from 'class-validator';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;
}

export default registerAs<RedisConfig>('redis', () => {
  console.info(`
    ======================================================================================================
        Register RedisConfig from environment variables
    ======================================================================================================
  `);
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    url: process.env.REDIS_URL,
  };
});
