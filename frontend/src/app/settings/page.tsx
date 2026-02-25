"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../hooks/useTheme';
import { DashboardLayout } from '../../components/Dashboard/DashboardLayout';

export default function Settings() {
    const router = useRouter();
    const { toggleTheme, isLightMode } = useTheme();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkUserAndLoadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkUserAndLoadSettings = async () => {
        setIsLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            router.push('/');
            return;
        }

        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Loading Settings...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Vault <span style={{ color: 'var(--primary-accent)' }}>Settings</span></h2>
                    <p style={{ color: 'var(--text-muted)' }}>Customize your vault experience and security preferences.</p>
                </div>

                <div className="glass-container" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                        Security & Preferences
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Theme Setting */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Display Theme</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Switch between Dark Mode (Default) and Light Mode.</p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                style={{
                                    background: isLightMode() ? 'var(--primary-accent)' : 'rgba(0,0,0,0.3)',
                                    border: `1px solid ${isLightMode() ? 'var(--primary-accent)' : 'var(--glass-border)'}`,
                                    color: isLightMode() ? '#000' : 'var(--text-main)',
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {isLightMode() ? '☀️ Light Mode Active' : '🌙 Dark Mode Active'}
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
