"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { supabase } from '../lib/supabase';

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
