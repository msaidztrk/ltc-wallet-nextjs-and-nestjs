import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class LogRepository {
    constructor(private readonly supabase: SupabaseService) { }

    async createTransactionLog(data: {
        user_id: string;
        wallet_id: string;
        tx_hash: string;
        amount: number;
        type: 'send' | 'receive';
        status: string;
    }, token: string) {
        return await this.supabase.getClient(token)
            .from('transaction_logs')
            .insert([data]);
    }

    async createErrorLog(data: {
        user_id: string | null;
        context: string;
        error_message: string;
        stack_trace?: string;
    }, token?: string) {
        const client = token ? this.supabase.getClient(token) : this.supabase.databaseClient;
        return await client.from('error_logs').insert([data]);
    }

    async getTransactionLogsByUserId(userId: string, token: string) {
        return await this.supabase.getClient(token)
            .from('transaction_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
    }
}
