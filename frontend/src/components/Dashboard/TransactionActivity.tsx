import { Wallet } from '../../types/wallet.types';

// Mock type based on what transaction_logs table looks like
interface TransactionLog {
    id: string;
    wallet_id: string;
    tx_hash: string;
    amount: number;
    type: 'send' | 'receive';
    status: string;
    created_at: string;
}

interface TransactionActivityProps {
    logs: TransactionLog[];
    wallets: Wallet[];
}

export function TransactionActivity({ logs, wallets }: TransactionActivityProps) {

    const getWalletName = (walletId: string) => {
        const wallet = wallets.find(w => w.id === walletId);
        return wallet ? wallet.name : 'Unknown Vault';
    };

    if (!logs || logs.length === 0) {
        return null;
    }

    return (
        <div className="glass-container" style={{ padding: '1.5rem', marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary-accent)' }}>~</span> Recent Activity
            </h3>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Action</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Wallet</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Amount (LTC)</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: log.type === 'send' ? '#ff6b6b' : 'var(--primary-accent)',
                                        display: 'inline-block'
                                    }}></span>
                                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{log.type}</span>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                    {getWalletName(log.wallet_id)}
                                </td>
                                <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: log.type === 'send' ? '#ff6b6b' : 'var(--text-main)' }}>
                                    {log.type === 'send' ? '-' : '+'}{log.amount.toFixed(4)}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        background: log.status === 'broadcasted' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                        color: log.status === 'broadcasted' ? 'var(--primary-accent)' : 'var(--text-muted)',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {log.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
