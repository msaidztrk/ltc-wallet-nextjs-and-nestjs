import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { CryptoModule } from '../crypto/crypto.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [CryptoModule, SupabaseModule],
  providers: [WalletService],
  controllers: [WalletController]
})
export class WalletModule { }
