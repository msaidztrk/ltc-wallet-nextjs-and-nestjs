import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoModule } from './crypto/crypto.module';
import { SupabaseModule } from './supabase/supabase.module';
import { WalletModule } from './wallet/wallet.module';
import { AuthMiddleware } from './auth/auth.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    WalletModule,
    CryptoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'wallets', method: RequestMethod.ALL },
        { path: 'wallets/:id', method: RequestMethod.ALL },
      );
  }
}
