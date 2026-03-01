"use client";

import { useWalletState } from '../../hooks/dashboard/useWalletState';
import { TransactionActivity } from '../../components/Dashboard/TransactionActivity';
import { useTranslation } from '../../hooks/useTranslation';

export default function ActivityPage() {
    const { activityHistory, wallets, isLoading } = useWalletState();
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <main>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p style={{ color: 'var(--text-muted)' }}>{t('loading_activity')}</p>
                </div>
            </main>
        );
    }

    return (
        <main>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>{t('activity_title')} <span style={{ color: 'var(--primary-accent)' }}>{t('activity_highlight')}</span></h2>
                    <p style={{ color: 'var(--text-muted)' }}>{t('activity_subtitle')}</p>
                </div>

                <TransactionActivity logs={activityHistory} wallets={wallets} />

                {activityHistory.length === 0 && (
                    <div className="glass-container" style={{ padding: '4rem', textAlign: 'center', marginTop: '2rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>{t('no_activity')}</p>
                    </div>
                )}
            </div>
        </main>
    );
}
