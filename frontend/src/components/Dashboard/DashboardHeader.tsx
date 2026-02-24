interface DashboardHeaderProps {
    onLogout: () => void;
}

export function DashboardHeader({ onLogout }: DashboardHeaderProps) {
    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0', letterSpacing: '-0.5px' }}>
                    Wallut<span style={{ color: 'var(--primary-accent)' }}>.</span> Vault
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage your secure Litecoin addresses</p>
            </div>
            <button
                onClick={onLogout}
                style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,60,60,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.2)', cursor: 'pointer', fontWeight: 600 }}
            >
                Lock Vault
            </button>
        </header>
    );
}
