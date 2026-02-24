"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

interface Wallet {
    id: string;
    name: string;
    public_address: string;
    created_at: string;
    liveBalance?: string;
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

    const router = useRouter();
    const API_URL = 'http://localhost:3001/wallets';

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
            const response = await fetch(API_URL, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (response.ok) {
                const result = await response.json();
                setWallets(result.data || []);
            } else {
                console.error('Failed to fetch wallets');
            }
        } catch (e) {
            console.error(e);
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
                const dbRes = await fetch(API_URL, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (dbRes.ok) {
                    const dbData = await dbRes.json();
                    freshWallets = dbData.data || [];
                } else {
                    freshWallets = [...wallets]; // Fallback to current if DB fetch fails
                }
            } catch (e) {
                freshWallets = [...wallets];
            }

            // If a wallet was just deleted elsewhere, the new freshWallets will be empty/smaller
            let stateUpdated = false;
            let fetchedBalances: Record<string, string> = {};

            // 2. Now loop through ONLY the verified fresh wallets and get their LTC balance
            for (let i = 0; i < freshWallets.length; i++) {
                try {
                    const res = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${freshWallets[i].public_address}/balance`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.balance !== undefined) {
                            fetchedBalances[freshWallets[i].id] = (data.balance / 100000000).toFixed(8) + ' LTC';
                            stateUpdated = true;
                        }
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
        try {
            // Fetch live balance directly from Litecoin Block Explorer API
            const res = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${wallet.public_address}/balance`);
            const data = await res.json();
            if (data.balance !== undefined) {
                // Blockcypher returns balance in satoshis (1 LTC = 100,000,000 satoshis)
                setSelectedWalletBalance((data.balance / 100000000).toFixed(8) + ' LTC');
            } else {
                setSelectedWalletBalance('0.00000000 LTC');
            }
        } catch (e) {
            console.error(e);
            setSelectedWalletBalance('Error Syncing Status');
        } finally {
            setSelectedWalletLoading(false);
        }
    };

    const handleCreateWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWalletName.trim() || !token) return;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ name: newWalletName.trim() }),
            });

            if (response.ok) {
                const result = await response.json();
                setWallets((prev) => [...prev, result.data]);
                setNewWalletName('');
                setIsCreating(false);
            }
        } catch (e) {
            console.error('Error creating wallet', e);
        }
    };

    const handleDeleteWallet = async (id: string) => {
        if (!token) return;
        const confirmDelete = window.confirm('Are you sure you want to permanently delete this wallet?');
        if (!confirmDelete) return;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setWallets((prev) => prev.filter((w) => w.id !== id));
            }
        } catch (e) {
            console.error('Error deleting wallet', e);
        }
    };

    const submitEditWallet = async (id: string) => {
        if (!editWalletName.trim() || !token) return;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ name: editWalletName.trim() }),
            });

            if (response.ok) {
                setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, name: editWalletName.trim() } : w)));
                setEditingWalletId(null);
                setEditWalletName('');
            }
        } catch (e) {
            console.error('Error renaming wallet', e);
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
                                                    <button onClick={() => handleDeleteWallet(wallet.id)} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.2rem' }} title="Delete Wallet">🗑️</button>
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
                                                    // Optional: You could use a toast library here for a cleaner experience
                                                    alert('Address copied to clipboard!');
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
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                    <div className="glass-container" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
                        <button onClick={() => setSelectedWallet(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                            {selectedWallet.name} <span style={{ color: 'var(--primary-accent)' }}>Vault</span>
                        </h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Public Address (LTC)</label>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#fff', border: '1px solid var(--glass-border)' }}>
                                {selectedWallet.public_address}
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Live Network Balance</label>
                            {selectedWalletLoading ? (
                                <div style={{ fontSize: '1.2rem', color: 'var(--primary-accent)', fontWeight: 600 }}>Syncing block data...</div>
                            ) : (
                                <div style={{ fontSize: '2.5rem', color: 'var(--primary-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.5rem', color: '#fff' }}>Ł</span> {selectedWalletBalance}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
