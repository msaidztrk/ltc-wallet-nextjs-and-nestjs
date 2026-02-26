"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../hooks/useTheme';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';

export default function Settings() {
    const router = useRouter();
    const { toggleTheme, isLightMode } = useTheme();
    const { settings, isLoading: isSettingsLoading, updateSetting } = useSettings();
    const { t } = useTranslation();
    const [isPageLoading, setIsPageLoading] = useState(true);

    useEffect(() => {
        checkUserAndLoadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkUserAndLoadSettings = async () => {
        setIsPageLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            router.push('/');
            return;
        }

        setIsPageLoading(false);
    };

    if (isPageLoading || isSettingsLoading) {
        return (
            <main>
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Loading Settings...</p>
                </div>
            </main>
        );
    }

    return (
        <main style={{ padding: '3rem 1rem' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>

                {/* Compact Header */}
                <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
                            {t('settings_title')}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                            {t('settings_subtitle')}
                        </p>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', opacity: 0.5 }}>
                        v1.2.0-STABLE
                    </span>
                </div>

                <div className="glass-container" style={{ padding: '0.5rem', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>

                    {/* Theme Setting - Compact Row */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ color: 'var(--primary-accent)', opacity: 0.8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{t('appearance_title')}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>{t('appearance_subtitle')}</p>
                            </div>
                        </div>

                        <button
                            onClick={toggleTheme}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid var(--glass-border)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                transition: 'all 0.2s',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {isLightMode() ? t('appearance_btn_light') : t('appearance_btn_dark')}
                        </button>
                    </div>

                    {/* Password Security - Compact Row */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ color: 'var(--primary-accent)', opacity: 0.8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{t('security_title')}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>{t('security_subtitle')}</p>
                            </div>
                        </div>

                        <div
                            onClick={() => updateSetting('require_password_for_tx', !settings.require_password_for_tx)}
                            style={{
                                width: '44px',
                                height: '24px',
                                background: settings.require_password_for_tx ? 'var(--primary-accent)' : 'rgba(255,255,255,0.1)',
                                borderRadius: '20px',
                                padding: '2px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                position: 'relative'
                            }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                background: settings.require_password_for_tx ? '#000' : '#fff',
                                borderRadius: '50%',
                                transition: 'all 0.2s ease',
                                transform: settings.require_password_for_tx ? 'translateX(20px)' : 'translateX(0)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>

                    {/* Language Settings - Compact Row */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ color: 'var(--primary-accent)', opacity: 0.8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10 M12 2A10 10 0 1 1 2 12" /></svg>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{t('lang_title')}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>{t('lang_subtitle')}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => updateSetting('language', 'en')}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    border: settings.language === 'en' ? '1px solid var(--primary-accent)' : '1px solid var(--glass-border)',
                                    background: settings.language === 'en' ? 'rgba(52, 199, 89, 0.1)' : 'transparent',
                                    color: settings.language === 'en' ? 'var(--primary-accent)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => updateSetting('language', 'tr')}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    border: settings.language === 'tr' ? '1px solid var(--primary-accent)' : '1px solid var(--glass-border)',
                                    background: settings.language === 'tr' ? 'rgba(52, 199, 89, 0.1)' : 'transparent',
                                    color: settings.language === 'tr' ? 'var(--primary-accent)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                TR
                            </button>
                        </div>
                    </div>

                </div>

                {/* Direct Logout / Danger Area (Minimalist) */}
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        style={{ background: 'transparent', border: 'none', color: '#ff6b6b', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                    >
                        {t('sign_out_btn')}
                    </button>
                </div>

            </div>
        </main>
    );
}
