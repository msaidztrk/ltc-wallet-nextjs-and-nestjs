import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { CryptoModule } from '../crypto/crypto.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { WalletRepository } from './wallet.repository';
import { WalletTransactionService } from './wallet-transaction.service';
import { BlockchainService } from './services/blockchain.service';

@Module({
  imports: [CryptoModule, SupabaseModule],
  providers: [WalletService, WalletRepository, WalletTransactionService, BlockchainService],
  controllers: [WalletController]
})
export class WalletModule { }
