import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class WalletRepository {
    constructor(private readonly databaseManager: SupabaseService) { }

    async createWallet(authenticatedUserId: string, name: string, encryptedMnemonic: string, jwtToken: string) {
        const { data, error } = await this.databaseManager.getClient(jwtToken)
            .from('wallets')
            .insert([{ user_id: authenticatedUserId, name, encrypted_mnemonic: encryptedMnemonic }])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insertion Error:', error);
            throw new InternalServerErrorException('Database insertion error for new wallet');
        }

        return data;
    }

    async findWalletsByUserId(authenticatedUserId: string, jwtToken: string) {
        const { data, error } = await this.databaseManager.getClient(jwtToken)
            .from('wallets')
            .select('id, name, created_at, encrypted_mnemonic')
            .eq('user_id', authenticatedUserId)
            .is('deleted_at', null);

        if (error) {
            console.error('Supabase Selection Error:', error);
            throw new InternalServerErrorException('Database matching error for wallets');
        }

        return data;
    }

    async findWalletByIdAndUserId(walletId: string, authenticatedUserId: string, jwtToken: string) {
        const { data, error } = await this.databaseManager.getClient(jwtToken)
            .from('wallets')
            .select('encrypted_mnemonic')
            .eq('id', walletId)
            .eq('user_id', authenticatedUserId)
            .is('deleted_at', null)
            .single();

        if (error || !data) {
            throw new InternalServerErrorException('Wallet not found or access denied in the database');
        }

        return data;
    }

    async updateWalletName(walletId: string, authenticatedUserId: string, newName: string, jwtToken: string) {
        const { data, error } = await this.databaseManager.getClient(jwtToken)
            .from('wallets')
            .update({ name: newName })
            .eq('id', walletId)
            .eq('user_id', authenticatedUserId)
            .select('id, name, created_at')
            .single();

        if (error) {
            console.error('Supabase Update Error:', error);
            throw new InternalServerErrorException('Database update error for wallet name');
        }

        return data;
    }

    async deleteWallet(walletId: string, authenticatedUserId: string, jwtToken: string) {
        const { error } = await this.databaseManager.getClient(jwtToken)
            .from('wallets')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', walletId)
            .eq('user_id', authenticatedUserId);

        if (error) {
            console.error('Supabase Deletion Error:', error);
            throw new InternalServerErrorException('Database deletion error for wallet');
        }

        return true;
    }
}
