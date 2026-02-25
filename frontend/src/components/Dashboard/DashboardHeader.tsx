import { useRouter } from 'next/navigation';
import { useTheme } from '../../hooks/useTheme';

interface DashboardHeaderProps {
    onLogout: () => void;
}

export function DashboardHeader({ onLogout }: DashboardHeaderProps) {
    const router = useRouter();
    const { toggleTheme, isLightMode } = useTheme();

    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <div style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0', letterSpacing: '-0.5px' }}>
                    Wallut<span style={{ color: 'var(--primary-accent)' }}>.</span> Vault
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage your secure Litecoin addresses</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={toggleTheme}
                    style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}
                    title="Toggle Theme"
                >
                    {isLightMode() ? '🌙' : '☀️'}
                </button>
                <button
                    onClick={() => router.push('/dashboard/settings')}
                    style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                >
                    Settings
                </button>
                <button
                    onClick={onLogout}
                    style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,60,60,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.2)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                >
                    Logout
                </button>
            </div>
        </header>
    );
}
