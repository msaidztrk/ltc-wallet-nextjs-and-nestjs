"use client";

import { useEffect } from 'react';

export function useTheme() {
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light');
        } else {
            document.body.classList.remove('light');
        }
    }, []);

    const toggleTheme = () => {
        const isLight = document.body.classList.contains('light');
        if (isLight) {
            document.body.classList.remove('light');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.add('light');
            localStorage.setItem('theme', 'light');
        }
    };

    const isLightMode = () => {
        if (typeof window !== 'undefined') {
            return document.body.classList.contains('light');
        }
        return false;
    };

    return { toggleTheme, isLightMode };
}
