import { AuthModule } from '@/api/auth/auth.module';
import authConfig from '@/api/auth/config/auth.config';
import { HealthModule } from '@/api/health/health.module';
import goongConfig from '@/api/stores/configs/goong.config';
import { UsersModule } from '@/api/users/users.module';
import zaloConfig from '@/api/zalo/config/zalo.config';
import redisConfig from '@/cache/config/redis.config';
import appConfig from '@/config/app.config';
import { AllConfigType } from '@/config/config.type';
import { DatabaseModule } from '@/database/database.module';
import { SharedModule } from '@/shared/shared.module';
import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheableMemory } from 'cacheable';
import 'dotenv/config';
import { Keyv } from 'keyv';
import { join } from 'path';
import { AnalyticsModule } from './api/analytics/analytics.module';
import { AreasModule } from './api/areas/areas.module';
import { BankingAccountModule } from './api/banking-account/banking-account.module';
import { BannersModule } from './api/banners/banners.module';
import { CategoriesModule } from './api/categories/categories.module';
import { CategoryItemsModule } from './api/category-items/category-items.module';
import { CommentInRatingsModule } from './api/comment-in-ratings/comment-in-ratings.module';
import { DeliversModule } from './api/delivers/delivers.module';
import { DeliveryRegionsModule } from './api/delivery-regions/delivery-regions.module';
import { EventsModule } from './api/events/events.module';
import { ExcelsModule } from './api/excels/excels.module';
import { ExtrasModule } from './api/extras/extras.module';
import { GatewaysModule } from './api/gateways/gateways.module';
import { LocationsModule } from './api/locations/locations.module';
import { ManagersModule } from './api/managers/managers.module';
import { NotificationsModule } from './api/notifications/notifications.module';
import { OptionsModule } from './api/options/options.module';
import { OrderDetailsModule } from './api/order-details/order-details.module';
import { OrdersModule } from './api/orders/orders.module';
import { ProductsModule } from './api/products/products.module';
import { RatingsModule } from './api/ratings/ratings.module';
import { SettingsModule } from './api/settings/settings.module';
import { StoreMenusModule } from './api/store-menus/store-menus.module';
import { StoreRequestsModule } from './api/store-requests/store-requests.module';
import { StoresModule } from './api/stores/stores.module';
import { TasksModule } from './api/tasks/tasks.module';
import { TransactionsModule } from './api/transactions/transactions.module';
import { VouchersModule } from './api/vouchers/vouchers.module';
import { ZaloModule } from './api/zalo/zalo.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import firebaseConfig from './firebase/config/firebase.config';
import { FirebaseModule } from './firebase/firebase.module';
import { UserAgentMiddleware } from './ua.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],
      load: [appConfig, redisConfig, authConfig, goongConfig, zaloConfig, firebaseConfig],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<AllConfigType>) => {
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            createKeyv(configService.get('redis.url', { infer: true })),
          ],
        };
      },
      isGlobal: true,
      inject: [ConfigService],
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return [
          {
            rootPath:
              configService.get('DEPLOY_MODE') === 'docker'
                ? join(__dirname, '..', 'uploads') // vì đang chạy trong /app/dist
                : join(__dirname, '..', '..', 'uploads'),
            serveRoot: '/api/images',
          },
        ];
      },
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot({
      global: true,
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    StoresModule,
    CategoriesModule,
    CategoryItemsModule,
    ZaloModule,
    SharedModule,
    ManagersModule,
    AreasModule,
    ProductsModule,
    StoreMenusModule,
    StoreRequestsModule,
    NotificationsModule,
    OrdersModule,
    RatingsModule,
    OptionsModule,
    ExtrasModule,
    LocationsModule,
    OrderDetailsModule,
    DeliversModule,
    AnalyticsModule,
    VouchersModule,
    BannersModule,
    SettingsModule,
    GatewaysModule,
    TransactionsModule,
    FirebaseModule,
    EventsModule,
    CommentInRatingsModule,
    ExcelsModule,
    BankingAccountModule,
    TasksModule,
    DeliveryRegionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserAgentMiddleware).forRoutes('*');
  }
}
