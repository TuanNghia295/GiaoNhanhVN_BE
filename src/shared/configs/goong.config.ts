import validateConfig from '@/utils/validate-config';
import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import { GoongConfig } from './goong-config.type';

class EnvironmentVariables {
  @IsString()
  @IsOptional()
  GOONG_API_KEY: string;

  @IsString()
  @IsOptional()
  GOONG_API_URL: string;
}

export default registerAs<GoongConfig>('goong', (): GoongConfig => {
  console.info(`Register AppConfig from environment variables`);

  validateConfig(process.env, EnvironmentVariables);

  return {
    apiKey: process.env.GOONG_API_KEY,
    apiUrl: process.env.GOONG_API_URL,
  };
});
