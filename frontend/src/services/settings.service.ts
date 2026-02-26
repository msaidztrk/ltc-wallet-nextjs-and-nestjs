import { apiClient } from '../lib/apiClient';

export interface UserSettings {
    user_id: string;
    require_password_for_tx: boolean;
    theme: string;
    language: string;
    updated_at?: string;
}

export class SettingsService {
    static async getSettings(token: string): Promise<UserSettings | null> {
        return apiClient.get('/settings', {
            headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => {
            console.error('SettingsService.getSettings error:', err);
            return null;
        }) as Promise<UserSettings | null>;
    }

    static async updateSettings(token: string, settings: Partial<UserSettings>): Promise<UserSettings | null> {
        return apiClient.post('/settings', settings, {
            headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => {
            console.error('SettingsService.updateSettings error:', err);
            return null;
        }) as Promise<UserSettings | null>;
    }

    static async verifyPassword(token: string, password: string): Promise<{ verified: boolean } | null> {
        return apiClient.post('/auth/verify-password', { password }, {
            headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => {
            console.error('SettingsService.verifyPassword error:', err);
            return null;
        }) as Promise<{ verified: boolean } | null>;
    }
}
