"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SettingsService, UserSettings } from '../services/settings.service';

export function useSettings() {
    const [settings, setSettings] = useState<UserSettings>({
        user_id: '',
        require_password_for_tx: false,
        theme: 'dark',
        language: 'en',
        sync_interval: 120
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

        const handleSettingsUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<UserSettings>;
            if (customEvent.detail) {
                setSettings(customEvent.detail);
            }
        };

        window.addEventListener('settingsUpdated', handleSettingsUpdated);
        return () => window.removeEventListener('settingsUpdated', handleSettingsUpdated);
    }, [fetchSettings]);

    const updateSetting = async (key: keyof UserSettings, value: any) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const oldSettings = { ...settings };
            const newSettings = { ...settings, [key]: value };
            setSettings(newSettings);
            window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: newSettings }));

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
