import { AuthConfig } from '@/api/auth/config/auth-config.type';
import { ZaloConfig } from '@/api/zalo/config/zalo-type.config';
import { RedisConfig } from '@/cache/config/redis-config.type';
import { AppConfig } from '@/config/app-config.type';
import { GoongConfig } from '@/shared/configs/goong-config.type';
import { FirebaseConfig } from '../firebase/config/firebase-config.type';

export type AllConfigType = {
  app: AppConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  zalo: ZaloConfig;
  goong: GoongConfig;
  firebase: FirebaseConfig;
};
