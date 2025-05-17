import { AllConfigType } from '@/config/config.type';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import admin from 'firebase-admin';
export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';
@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: configService.get('firebase.projectId', { infer: true }),
            clientEmail: configService.get('firebase.clientEmail', {
              infer: true,
            }),
            privateKey: configService.get('firebase.privateKey', {
              infer: true,
            }),
          }),
        });
      },
    },
  ],
  exports: [FIREBASE_ADMIN],
})
export class FirebaseModule {}
