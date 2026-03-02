"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function GlobalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
                if (pathname !== '/') {
                    window.location.href = '/';
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [pathname]);

    // Global window focus tracking
    useEffect(() => {
        if (pathname === '/') return;

        const handleBlur = () => {
            toast('\u23f8 Sync paused \u2014 window is inactive', {
                id: 'sync-paused-toast',
                duration: Infinity,
                icon: '\ud83d\udd15',
                style: { background: '#1a1a2e', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem' }
            });
        };

        const handleFocus = () => {
            toast.dismiss('sync-paused-toast');
            toast.success('\u25b6 Sync resumed', { id: 'sync-resumed-toast', duration: 2500 });
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [pathname]);

    if (pathname === '/') {
        return <>{children}</>;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
            <AppSidebar />
            <div style={{
                flex: 1,
                marginLeft: '260px',
                padding: '2rem 3rem',
                minHeight: '100vh',
                position: 'relative'
            }}>
                {children}
            </div>
        </div>
    );
}
