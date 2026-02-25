"use client";

import { usePathname } from 'next/navigation';
import { AppSidebar } from './AppSidebar';

export function GlobalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Do not show the sidebar on the landing/login page
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
