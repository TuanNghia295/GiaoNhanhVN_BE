import { registerAs } from '@nestjs/config';
import { IsString } from 'class-validator';
import validateConfig from 'src/utils/validate-config';
import { FirebaseConfig } from './firebase-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  FIREBASE_PROJECT_ID!: string;

  @IsString()
  FIREBASE_CLIENT_EMAIL!: string;

  @IsString()
  FIREBASE_PRIVATE_KEY!: string;
}

export default registerAs<FirebaseConfig>('firebase', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
});
