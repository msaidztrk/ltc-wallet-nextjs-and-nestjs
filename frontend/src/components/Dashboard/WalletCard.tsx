import { useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet } from '../../types/wallet.types';

interface WalletCardProps {
    wallet: Wallet;
    usdRate: number | null;
    onEditSubmit: (id: string, newName: string) => Promise<void>;
    onDelete: (id: string, name: string) => void;
    onOpenDetails: (wallet: Wallet) => void;
}

export function WalletCard({ wallet, usdRate, onEditSubmit, onDelete, onOpenDetails }: WalletCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(wallet.name);

    const handleEditConfirm = async () => {
        if (!editName.trim()) return;
        await onEditSubmit(wallet.id, editName.trim());
        setIsEditing(false);
    };

    return (
        <div className="glass-container" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.05)' }}>

            {/* Left side: Name and Balance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1' }}>
                {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '250px' }}>
                        <input
                            className="input-premium"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem', height: 'auto', minHeight: 'unset' }}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                        />
                        <button onClick={handleEditConfirm} style={{ background: 'var(--primary-accent)', color: '#000', border: 'none', borderRadius: '4px', padding: '0 0.75rem', cursor: 'pointer' }}>✓</button>
                        <button onClick={() => {
                            setIsEditing(false);
                            setEditName(wallet.name);
                        }} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 0.75rem', cursor: 'pointer' }}>✕</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: '#fff' }}>{wallet.name}</h2>
                        <div style={{ display: 'flex', gap: '0.2rem', opacity: 0.5, transition: 'opacity 0.2s' }} className="wallet-actions">
                            <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.2rem' }} title="Edit Name">✏️</button>
                            <button onClick={() => onDelete(wallet.id, wallet.name)} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.2rem' }} title="Delete Wallet">🗑️</button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto-Sync:</span>
                    <span style={{ fontSize: '1.05rem', color: 'var(--primary-accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {wallet.liveBalance ? wallet.liveBalance : 'Syncing...'}
                    </span>
                    {wallet.liveBalance && usdRate && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            (~ ${(parseFloat(wallet.liveBalance) * usdRate).toFixed(2)} USD)
                        </span>
                    )}
                </div>
            </div>

            {/* Middle: Address */}
            <div style={{ flex: '1.5', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span className="text-label" style={{ fontSize: '0.7rem' }}>LTC Address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {wallet.public_address}
                    </span>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(wallet.public_address);
                            toast.success('Address copied to clipboard!');
                        }}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        title="Copy Address"
                    >
                        📋
                    </button>
                </div>
            </div>

            {/* Right side: Actions & Date */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem', flex: '0.7' }}>
                <button
                    onClick={() => onOpenDetails(wallet)}
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    title="Vault Actions"
                >
                    ⚙️ Actions
                </button>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Created: {new Date(wallet.created_at).toLocaleDateString()}
                </div>
            </div>

        </div>
    );
}
