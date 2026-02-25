"use client";

import { useDashboardWallets } from '../../hooks/useDashboardWallets';
import { TransactionActivity } from '../../components/Dashboard/TransactionActivity';

export default function ActivityPage() {
    const { activityHistory, wallets, isLoading } = useDashboardWallets();

    if (isLoading) {
        return (
            <main>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Loading activity data...</p>
                </div>
            </main>
        );
    }

    return (
        <main>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Transaction <span style={{ color: 'var(--primary-accent)' }}>Logs</span></h2>
                    <p style={{ color: 'var(--text-muted)' }}>A complete history of your vault's internal transactions.</p>
                </div>

                <TransactionActivity logs={activityHistory} wallets={wallets} />

                {activityHistory.length === 0 && (
                    <div className="glass-container" style={{ padding: '4rem', textAlign: 'center', marginTop: '2rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No activity recorded yet.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
