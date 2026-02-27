import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SettingsRepository {
    constructor(private readonly supabaseService: SupabaseService) { }

    async getSettings(userId: string, token: string) {
        const { data, error } = await this.supabaseService.getClient(token)
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return {
                user_id: userId,
                require_password_for_tx: false,
                theme: 'dark',
                language: 'en',
                sync_interval: 120
            };
        }

        if (data.sync_interval === undefined || data.sync_interval === null) {
            data.sync_interval = 120;
        }

        return data;
    }

    async updateSettings(userId: string, settings: any, token: string) {
        const { data, error } = await this.supabaseService.getClient(token)
            .from('user_settings')
            .upsert({ user_id: userId, ...settings })
            .select()
            .single();

        if (error) {
            console.error('Supabase Upsert Error in Settings:', JSON.stringify(error, null, 2));
            throw error;
        }
        return data;
    }
}
