"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SettingsService, UserSettings } from '../services/settings.service';

export function useSettings() {
    const [settings, setSettings] = useState<UserSettings>({
        user_id: '',
        require_password_for_tx: false,
        theme: 'dark'
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const data = await SettingsService.getSettings(session.access_token);
                if (data) {
                    setSettings(data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSetting = async (key: keyof UserSettings, value: any) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const oldSettings = { ...settings };
            const newSettings = { ...settings, [key]: value };
            setSettings(newSettings);

            try {
                const result = await SettingsService.updateSettings(session.access_token, { [key]: value });
                if (!result) {
                    throw new Error('Update failed');
                }
            } catch (error) {
                console.error('Failed to update settings:', error);
                setSettings(oldSettings);
            }
        }
    };

    return {
        settings,
        isLoading,
        updateSetting,
        refreshSettings: fetchSettings
    };
}
