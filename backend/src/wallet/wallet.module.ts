import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { CryptoModule } from '../crypto/crypto.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { WalletRepository } from './wallet.repository';
import { WalletTransactionService } from './wallet-transaction.service';

@Module({
  imports: [CryptoModule, SupabaseModule],
  providers: [WalletService, WalletRepository, WalletTransactionService],
  controllers: [WalletController]
})
export class WalletModule { }
