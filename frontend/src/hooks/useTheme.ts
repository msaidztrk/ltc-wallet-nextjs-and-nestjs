"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

let isUserThemeLoaded = false;

export function useTheme() {
    const [isLight, setIsLight] = useState(false);

    useEffect(() => {
        // Instant visual read from local storage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light');
            setIsLight(true);
        } else {
            document.body.classList.remove('light');
            setIsLight(false);
        }

        // Async fetch from Supabase
        if (!isUserThemeLoaded) {
            isUserThemeLoaded = true;
            fetchUserTheme();
        }
    }, []);

    const fetchUserTheme = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data, error } = await supabase
                .from('user_settings')
                .select('theme')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (data && data.theme) {
                if (data.theme === 'light') {
                    document.body.classList.add('light');
                    localStorage.setItem('theme', 'light');
                    setIsLight(true);
                } else {
                    document.body.classList.remove('light');
                    localStorage.setItem('theme', 'dark');
                    setIsLight(false);
                }
            } else if (!data) {
                // Initialize default setting if not present
                await supabase.from('user_settings').insert([
                    { user_id: session.user.id, theme: 'dark' }
                ]);
            }
        }
    };

    const toggleTheme = async () => {
        const currentlyLight = document.body.classList.contains('light');
        const nextTheme = currentlyLight ? 'dark' : 'light';

        if (nextTheme === 'light') {
            document.body.classList.add('light');
            setIsLight(true);
        } else {
            document.body.classList.remove('light');
            setIsLight(false);
        }
        localStorage.setItem('theme', nextTheme);

        // Async persist to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await supabase
                .from('user_settings')
                .upsert([{ user_id: session.user.id, theme: nextTheme }]);
        }
    };

    const isLightMode = () => isLight;

    return { toggleTheme, isLightMode };
}
