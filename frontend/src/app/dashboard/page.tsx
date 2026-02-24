"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

interface Wallet {
    id: string;
    name: string;
    public_address: string;
    created_at: string;
}

export default function Dashboard() {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);

    // New Wallet form state
    const [isCreating, setIsCreating] = useState(false);
    const [newWalletName, setNewWalletName] = useState('');

    // Editing state
    const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
    const [editWalletName, setEditWalletName] = useState('');

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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {wallets.map((wallet) => (
                            <div key={wallet.id} className="glass-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {editingWalletId === wallet.id ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                            <input
                                                className="input-premium"
                                                value={editWalletName}
                                                onChange={(e) => setEditWalletName(e.target.value)}
                                                autoFocus
                                            />
                                            <button onClick={() => submitEditWallet(wallet.id)} style={{ background: 'var(--primary-accent)', color: '#000', border: 'none', borderRadius: '4px', padding: '0 0.5rem', cursor: 'pointer' }}>✓</button>
                                            <button onClick={() => setEditingWalletId(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 0.5rem', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    ) : (
                                        <>
                                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{wallet.name}</h2>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <button onClick={() => startEditing(wallet)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>Edit</button>
                                                <button onClick={() => handleDeleteWallet(wallet.id)} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.9rem' }}>Delete</button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="text-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Public Address (LTC)</label>
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--glass-border)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--primary-accent)' }}>
                                        {wallet.public_address}
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Created: {new Date(wallet.created_at).toLocaleDateString()}
                                </div>

                            </div>
                        ))}
                    </div>
                )}

            </div>
        </main>
    );
}
