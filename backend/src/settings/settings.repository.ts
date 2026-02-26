import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SettingsRepository {
    constructor(private readonly supabaseService: SupabaseService) { }

    async getSettings(userId: string) {
        const { data, error } = await this.supabaseService.getClient()
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return {
                user_id: userId,
                require_password_for_tx: false,
                theme: 'dark'
            };
        }

        return data;
    }

    async updateSettings(userId: string, settings: any) {
        const { data, error } = await this.supabaseService.getClient()
            .from('user_settings')
            .upsert({ user_id: userId, ...settings })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}
