"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { WalletService } from '../../services/wallet.service';
import { LitecoinService } from '../../services/litecoin.service';

import { Wallet, TxRef } from '../../types/wallet.types';
import { WalletDetailsModal } from '../../components/Dashboard/WalletDetailsModal';
import { DashboardHeader } from '../../components/Dashboard/DashboardHeader';
import { CreateWalletForm } from '../../components/Dashboard/CreateWalletForm';
import { WalletCard } from '../../components/Dashboard/WalletCard';

export default function Dashboard() {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [syncCountdown, setSyncCountdown] = useState(120);

    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [selectedWalletBalance, setSelectedWalletBalance] = useState<string | null>(null);
    const [selectedWalletLoading, setSelectedWalletLoading] = useState(false);
    const [selectedWalletHistory, setSelectedWalletHistory] = useState<TxRef[]>([]);

    const [ltcUsdRate, setLtcUsdRate] = useState<number | null>(null);

    const router = useRouter();

    useEffect(() => {
        checkUserAndFetchWallets();
        fetchLtcRate();
    }, []);

    const fetchLtcRate = async () => {
        const rate = await LitecoinService.getLtcToUsdRate();
        setLtcUsdRate(rate);
    };

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
        const result = await WalletService.getWallets(accessToken);
        if (result && result.data) {
            setWallets(result.data);
        } else {
            setWallets([]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (wallets.length === 0) return;

        let isSyncing = false;

        const updateBalancesSequentially = async () => {
            isSyncing = true;
            let freshWallets: Wallet[] = [];

            if (!token) {
                freshWallets = [...wallets];
            } else {
                const dbData = await WalletService.getWallets(token);
                freshWallets = dbData?.data ? dbData.data : [...wallets];
            }

            let stateUpdated = false;
            let fetchedBalances: Record<string, string> = {};

            for (let i = 0; i < freshWallets.length; i++) {
                const data = await LitecoinService.getBalance(freshWallets[i].public_address);
                if (data && data.balance !== undefined) {
                    fetchedBalances[freshWallets[i].id] = (data.balance / 100000000).toFixed(8) + ' LTC';
                    stateUpdated = true;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            if (stateUpdated || freshWallets.length !== wallets.length) {
                setWallets(freshWallets.map(w => ({
                    ...w,
                    liveBalance: fetchedBalances[w.id] || '0.00000000 LTC'
                })));
            }

            isSyncing = false;
        };

        updateBalancesSequentially();
        setSyncCountdown(120);

        const tick = () => {
            setSyncCountdown(prev => {
                if (prev <= 1) {
                    if (!isSyncing) {
                        updateBalancesSequentially();
                    }
                    return 120;
                }
                return prev - 1;
            });
        };

        const intervalId = setInterval(tick, 1000);

        return () => clearInterval(intervalId);
    }, [wallets.length, token]);

    const openWalletDetails = async (wallet: Wallet) => {
        setSelectedWallet(wallet);
        setSelectedWalletLoading(true);
        setSelectedWalletBalance(null);
        setSelectedWalletHistory([]);

        const data = await LitecoinService.getAddressDetails(wallet.public_address);
        if (data && data.balance !== undefined) {
            setSelectedWalletBalance((data.balance / 100000000).toFixed(8) + ' LTC');
            setSelectedWalletHistory(data.txrefs || []);
        } else {
            setSelectedWalletBalance('Error or 0 LTC');
        }

        setSelectedWalletLoading(false);
    };

    const handleSendLTC = async (address: string, amount: string) => {
        if (!token || !selectedWallet) return false;

        const result = await WalletService.sendLTC(token, selectedWallet.id, address, parseFloat(amount));
        if (result) {
            toast.success(`Successfully sent ${amount} LTC!`);
            openWalletDetails(selectedWallet);
            return true;
        }
        return false;
    };

    const handleCreateWallet = async (name: string) => {
        if (!token) return;

        const result = await WalletService.createWallet(token, name);
        if (result && result.data) {
            setWallets((prev) => [...prev, result.data]);
            toast.success('New Litecoin Vault Generated!');
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
                            const result = await WalletService.deleteWallet(token, id);
                            if (result) {
                                setWallets((prev) => prev.filter((w) => w.id !== id));
                                toast.success('Wallet deleted successfully');
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

    const submitEditWallet = async (id: string, newName: string) => {
        if (!token) return;

        const result = await WalletService.renameWallet(token, id, newName);
        if (result) {
            setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, name: newName } : w)));
            toast.success('Wallet renamed successfully');
        }
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

                <DashboardHeader onLogout={handleLogout} />

                <div style={{ marginBottom: '2rem' }}>
                    <CreateWalletForm onCreate={handleCreateWallet} />
                </div>

                {wallets.length === 0 ? (
                    <div className="glass-container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>No wallets found in this vault.</p>
                    </div>
                ) : (
                    <>
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
                                <WalletCard
                                    key={wallet.id}
                                    wallet={wallet}
                                    usdRate={ltcUsdRate}
                                    onEditSubmit={submitEditWallet}
                                    onDelete={handleDeleteWallet}
                                    onOpenDetails={openWalletDetails}
                                />
                            ))}
                        </div>
                    </>
                )}

            </div>

            {selectedWallet && (
                <WalletDetailsModal
                    wallet={selectedWallet}
                    balance={selectedWalletBalance}
                    history={selectedWalletHistory}
                    isLoading={selectedWalletLoading}
                    onClose={() => setSelectedWallet(null)}
                    onSendLTC={handleSendLTC}
                    usdRate={ltcUsdRate}
                />
            )}
        </main>
    );
}
