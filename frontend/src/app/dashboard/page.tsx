"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { WalletService } from '../../services/wallet.service';
import { LitecoinService } from '../../services/litecoin.service';

interface Wallet {
    id: string;
    name: string;
    public_address: string;
    created_at: string;
    liveBalance?: string;
}

interface TxRef {
    tx_hash: string;
    value: number;
    confirmed?: string;
    tx_input_n: number;
    tx_output_n: number;
}

export default function Dashboard() {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [syncCountdown, setSyncCountdown] = useState(120);

    // New Wallet form state
    const [isCreating, setIsCreating] = useState(false);
    const [newWalletName, setNewWalletName] = useState('');

    // Editing state
    const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
    const [editWalletName, setEditWalletName] = useState('');

    // Modal Details state
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [selectedWalletBalance, setSelectedWalletBalance] = useState<string | null>(null);
    const [selectedWalletLoading, setSelectedWalletLoading] = useState(false);
    const [selectedWalletHistory, setSelectedWalletHistory] = useState<TxRef[]>([]);

    const router = useRouter();

    useEffect(() => {
        checkUserAndFetchWallets();
    }, []);

    const checkUserAndFetchWallets = async () => {
        setIsLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            router.push('/');
            return;
        }

        setToken(session.access_token);
        await fetchWallets(session.access_token);
    };

    const fetchWallets = async (accessToken: string) => {
        try {
            const result = await WalletService.getWallets(accessToken);
            setWallets(result.data || []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to fetch wallets');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-fetch balances timer
    useEffect(() => {
        if (wallets.length === 0) return;

        let isSyncing = false;

        const updateBalancesSequentially = async () => {
            isSyncing = true;
            let freshWallets: Wallet[] = [];

            // 1. First, fetch the latest list of wallets from our database to catch any deletions/additions
            try {
                if (!token) throw new Error('No token');
                const dbData = await WalletService.getWallets(token);
                freshWallets = dbData.data || [];
            } catch (e) {
                freshWallets = [...wallets];
            }

            // If a wallet was just deleted elsewhere, the new freshWallets will be empty/smaller
            let stateUpdated = false;
            let fetchedBalances: Record<string, string> = {};

            // 2. Now loop through ONLY the verified fresh wallets and get their LTC balance
            for (let i = 0; i < freshWallets.length; i++) {
                try {
                    const data = await LitecoinService.getBalance(freshWallets[i].public_address);
                    if (data && data.balance !== undefined) {
                        fetchedBalances[freshWallets[i].id] = (data.balance / 100000000).toFixed(8) + ' LTC';
                        stateUpdated = true;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (e) {
                    console.error("Failed auto-sync for wallet", freshWallets[i].id);
                }
            }

            if (stateUpdated || freshWallets.length !== wallets.length) {
                // Completely overwrite state with fresh wallets + their new balances
                setWallets(freshWallets.map(w => ({
                    ...w,
                    liveBalance: fetchedBalances[w.id] || '0.00000000 LTC'
                })));
            }

            isSyncing = false;
        };

        // Run first fetch without delay
        updateBalancesSequentially();
        setSyncCountdown(120);

        const tick = () => {
            setSyncCountdown(prev => {
                if (prev <= 1) {
                    if (!isSyncing) {
                        updateBalancesSequentially();
                    }
                    return 120; // Reset visual timer
                }
                return prev - 1;
            });
        };

        // Tick every 1 second
        const intervalId = setInterval(tick, 1000);

        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallets.length, token]); // Re-bind if auth token or structural counts change

    const openWalletDetails = async (wallet: Wallet) => {
        setSelectedWallet(wallet);
        setSelectedWalletLoading(true);
        setSelectedWalletBalance(null);
        setSelectedWalletHistory([]);
        try {
            // Fetch live balance and full tx history using LitecoinService
            const data = await LitecoinService.getAddressDetails(wallet.public_address);
            if (data && data.balance !== undefined) {
                // Blockcypher returns balance in satoshis (1 LTC = 100,000,000 satoshis)
                setSelectedWalletBalance((data.balance / 100000000).toFixed(8) + ' LTC');
            } else {
                setSelectedWalletBalance('0.00000000 LTC');
            }
            if (data && data.txrefs) {
                setSelectedWalletHistory(data.txrefs);
            }
        } catch (e) {
            console.error(e);
            setSelectedWalletBalance('Error Syncing Status');
            toast.error('Network Error: Failed to fetch blockchain data');
        } finally {
            setSelectedWalletLoading(false);
        }
    };

    const handleCreateWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWalletName.trim() || !token) return;

        try {
            const result = await WalletService.createWallet(token, newWalletName.trim());
            setWallets((prev) => [...prev, result.data]);
            setNewWalletName('');
            setIsCreating(false);
            toast.success('New Litecoin Vault Generated!');
        } catch (e) {
            console.error('Error creating wallet', e);
            toast.error('Network error during creation');
        }
    };

    const handleDeleteWallet = async (id: string, name: string) => {
        if (!token) return;

        toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Delete '{name}' Wallet?</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>This action is irreversible. All access via this dashboard will be lost.</span>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            // Proceed with deletion
                            try {
                                await WalletService.deleteWallet(token, id);
                                setWallets((prev) => prev.filter((w) => w.id !== id));
                                toast.success('Wallet deleted successfully');
                            } catch (e) {
                                toast.error('Error communicating with server');
                            }
                        }}
                        style={{ background: 'rgba(255,60,60,0.2)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '4px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        ), { duration: Infinity });

    };

    const submitEditWallet = async (id: string) => {
        if (!editWalletName.trim() || !token) return;

        try {
            await WalletService.renameWallet(token, id, editWalletName.trim());
            setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, name: editWalletName.trim() } : w)));
            setEditingWalletId(null);
            setEditWalletName('');
            toast.success('Wallet renamed successfully');
        } catch (e) {
            console.error('Error renaming wallet', e);
            toast.error('Error renaming wallet');
        }
    };

    const startEditing = (wallet: Wallet) => {
        setEditingWalletId(wallet.id);
        setEditWalletName(wallet.name);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (isLoading) {
        return (
            <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Decrypting Vault Data...</p>
            </main>
        );
    }

    return (
        <main style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                {/* Navigation / Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0', letterSpacing: '-0.5px' }}>
                            Wallut<span style={{ color: 'var(--primary-accent)' }}>.</span> Vault
                        </h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage your secure Litecoin addresses</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,60,60,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.2)', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Lock Vault
                    </button>
                </header>

                {/* Action Bar */}
                <div style={{ marginBottom: '2rem' }}>
                    {!isCreating ? (
                        <button className="btn-primary" onClick={() => setIsCreating(true)}>
                            + Generate New Wallet
                        </button>
                    ) : (
                        <form onSubmit={handleCreateWallet} className="glass-container" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', maxWidth: '500px' }}>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Wallet Name (e.g. Savings)"
                                value={newWalletName}
                                onChange={(e) => setNewWalletName(e.target.value)}
                                autoFocus
                                required
                            />
                            <button className="btn-primary" type="submit">Create</button>
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </form>
                    )}
                </div>

                {/* Wallets Grid */}
                {wallets.length === 0 ? (
                    <div className="glass-container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>No wallets found in this vault.</p>
                    </div>
                ) : (
                    <>
                        {/* Auto-Sync Progress Bar */}
                        <div style={{ marginBottom: '2rem', background: 'var(--glass-bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Next Network Sync Process</span>
                                <span style={{ color: 'var(--primary-accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{syncCountdown}s</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(syncCountdown / 120) * 100}%`, height: '100%', background: 'linear-gradient(90deg, transparent, var(--primary-accent))', transition: 'width 1s linear', boxShadow: '0 0 10px var(--primary-accent)' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {wallets.map((wallet) => (
                                <div key={wallet.id} className="glass-container" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.05)' }}>

                                    {/* Left side: Name and Balance */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1' }}>
                                        {editingWalletId === wallet.id ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '250px' }}>
                                                <input
                                                    className="input-premium"
                                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem', height: 'auto', minHeight: 'unset' }}
                                                    value={editWalletName}
                                                    onChange={(e) => setEditWalletName(e.target.value)}
                                                    autoFocus
                                                />
                                                <button onClick={() => submitEditWallet(wallet.id)} style={{ background: 'var(--primary-accent)', color: '#000', border: 'none', borderRadius: '4px', padding: '0 0.75rem', cursor: 'pointer' }}>✓</button>
                                                <button onClick={() => setEditingWalletId(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 0.75rem', cursor: 'pointer' }}>✕</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: '#fff' }}>{wallet.name}</h2>
                                                <div style={{ display: 'flex', gap: '0.2rem', opacity: 0.5, transition: 'opacity 0.2s' }} className="wallet-actions">
                                                    <button onClick={() => startEditing(wallet)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.2rem' }} title="Edit Name">✏️</button>
                                                    <button onClick={() => handleDeleteWallet(wallet.id, wallet.name)} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.2rem' }} title="Delete Wallet">🗑️</button>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto-Sync:</span>
                                            <span style={{ fontSize: '1.05rem', color: 'var(--primary-accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                                                {wallet.liveBalance ? wallet.liveBalance : 'Syncing...'}
                                            </span>
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
                                        <button onClick={() => openWalletDetails(wallet)} style={{ background: 'rgba(202, 255, 51, 0.1)', color: 'var(--primary-accent)', border: '1px solid rgba(202, 255, 51, 0.3)', padding: '0.5rem 1.25rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-accent)'}
                                            onMouseOverCapture={(e) => e.currentTarget.style.color = '#000'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(202, 255, 51, 0.1)'}
                                            onMouseOutCapture={(e) => e.currentTarget.style.color = 'var(--primary-accent)'}
                                        >
                                            Open Vault
                                        </button>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            Created: {new Date(wallet.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                </div>
                            ))}
                        </div>
                    </>
                )}

            </div>

            {/* Wallet Details Modal */}
            {selectedWallet && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                    <div className="glass-container" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', position: 'relative' }}>
                        <button onClick={() => setSelectedWallet(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >✕</button>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                            {selectedWallet.name} <span style={{ color: 'var(--primary-accent)' }}>Vault</span>
                        </h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Public Address (LTC)</label>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#fff', border: '1px solid var(--glass-border)' }}>
                                {selectedWallet.public_address}
                            </div>
                        </div>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Live Network Balance</label>
                            {selectedWalletLoading ? (
                                <div style={{ fontSize: '1.2rem', color: 'var(--primary-accent)', fontWeight: 600 }}>Syncing block data...</div>
                            ) : (
                                <div style={{ fontSize: '2.5rem', color: 'var(--primary-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.5rem', color: '#fff' }}>Ł</span> {selectedWalletBalance}
                                </div>
                            )}
                        </div>

                        {/* Transaction History Table */}
                        <div>
                            <label className="text-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Transaction History</label>

                            {selectedWalletLoading ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                                    Loading blockchain records...
                                </div>
                            ) : selectedWalletHistory.length === 0 ? (
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--glass-border)' }}>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No transactions found for this wallet on the Litecoin network.</p>
                                </div>
                            ) : (
                                <div style={{ background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                            <thead style={{ background: 'rgba(0,0,0,0.7)', position: 'sticky', top: 0, zIndex: 1, backdropFilter: 'blur(10px)' }}>
                                                <tr>
                                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--glass-border)' }}>Type</th>
                                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--glass-border)' }}>Amount (LTC)</th>
                                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--glass-border)' }}>Date</th>
                                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--glass-border)' }}>TX Hash</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedWalletHistory.map((tx, index) => {
                                                    const isReceived = tx.tx_input_n === -1;
                                                    const amount = (tx.value / 100000000).toFixed(8);
                                                    const date = tx.confirmed ? new Date(tx.confirmed).toLocaleString() : 'Unconfirmed';
                                                    return (
                                                        <tr key={`${tx.tx_hash}-${index}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s', ...(!tx.confirmed ? { opacity: 0.6 } : {}) }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <td style={{ padding: '1rem' }}>
                                                                <span style={{
                                                                    background: isReceived ? 'rgba(202, 255, 51, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                                                                    color: isReceived ? 'var(--primary-accent)' : '#ff6b6b',
                                                                    padding: '0.3rem 0.6rem',
                                                                    borderRadius: '4px',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.75rem',
                                                                    letterSpacing: '0.5px'
                                                                }}>
                                                                    {isReceived ? '↓ RECEIVED' : '↑ SENT'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                                                {amount}
                                                            </td>
                                                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                                                {date}
                                                            </td>
                                                            <td style={{ padding: '1rem' }}>
                                                                <a
                                                                    href={`https://live.blockcypher.com/ltc/tx/${tx.tx_hash}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'color 0.2s' }}
                                                                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary-accent)'; }}
                                                                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                                                                >
                                                                    {tx.tx_hash.substring(0, 8)}...{tx.tx_hash.substring(tx.tx_hash.length - 8)}
                                                                    <span style={{ fontSize: '0.7rem' }}>↗</span>
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
