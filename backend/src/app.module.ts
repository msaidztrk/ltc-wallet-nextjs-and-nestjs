import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoModule } from './crypto/crypto.module';
import { SupabaseModule } from './supabase/supabase.module';
import { WalletModule } from './wallet/wallet.module';
import { AuthMiddleware } from './auth/auth.middleware';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    SupabaseModule,
    CommonModule,
    WalletModule,
    CryptoModule,
    AuthModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'wallets', method: RequestMethod.ALL },
        { path: 'wallets/history', method: RequestMethod.GET },
        { path: 'wallets/rate-limit', method: RequestMethod.GET },
        { path: 'wallets/:id', method: RequestMethod.ALL },
        { path: 'wallets/:id/balance', method: RequestMethod.GET },
        { path: 'wallets/:id/send', method: RequestMethod.POST },
        { path: 'auth/verify-password', method: RequestMethod.POST },
        { path: 'settings', method: RequestMethod.ALL }
      );
  }
}
