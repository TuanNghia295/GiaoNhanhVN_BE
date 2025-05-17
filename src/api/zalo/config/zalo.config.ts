import { registerAs } from '@nestjs/config';
import { IsNotEmpty, IsString } from 'class-validator';
import validateConfig from '../../../utils/validate-config';
import { ZaloConfig } from './zalo-type.config';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  ZALO_APP_ID: string;

  @IsString()
  @IsNotEmpty()
  ZALO_APP_SECRET: string;

  @IsString()
  @IsNotEmpty()
  ZALO_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  ZNS_API_URL: string;

  @IsString()
  @IsNotEmpty()
  ZALO_OA_OAUTH_URL: string;

  @IsString()
  @IsNotEmpty()
  ZALO_ZNS_OPEN_API_URL: string;

  @IsString()
  @IsNotEmpty()
  ZALO_OPEN_API_URL: string;
}

export default registerAs<ZaloConfig>('zalo', () => {
  console.info(`Register ZaloConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    app_id: process.env.ZALO_APP_ID,
    app_secret: process.env.ZALO_APP_SECRET,
    zns_template_id: process.env.ZALO_TEMPLATE_ID,
    zns_open_api_url: process.env.ZALO_ZNS_OPEN_API_URL,
    open_api_url: process.env.ZALO_OPEN_API_URL,
    oauth_url: process.env.ZALO_OA_OAUTH_URL,
    api_url: process.env.ZNS_API_URL,
  };
});
