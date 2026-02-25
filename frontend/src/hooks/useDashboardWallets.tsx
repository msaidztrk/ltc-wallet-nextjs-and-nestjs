import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { WalletService } from '../services/wallet.service';
import { LitecoinService } from '../services/litecoin.service';
import { Wallet, TxRef } from '../types/wallet.types';

export function useDashboardWallets() {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [syncCountdown, setSyncCountdown] = useState(120);

    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [selectedWalletBalance, setSelectedWalletBalance] = useState<string | null>(null);
    const [selectedWalletLoading, setSelectedWalletLoading] = useState(false);
    const [selectedWalletHistory, setSelectedWalletHistory] = useState<TxRef[]>([]);
    const [activityHistory, setActivityHistory] = useState<any[]>([]);

    const [ltcUsdRate, setLtcUsdRate] = useState<number | null>(null);

    const router = useRouter();

    useEffect(() => {
        checkUserAndFetchWallets();
        fetchLtcRate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        await Promise.all([
            fetchWallets(session.access_token),
            fetchActivityHistory(session.access_token)
        ]);
    };

    const fetchActivityHistory = async (accessToken: string) => {
        const result = await WalletService.getActivityHistory(accessToken);
        if (result && result.data) {
            setActivityHistory(result.data);
        }
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
            const fetchedBalances: Record<string, string> = {};

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            fetchActivityHistory(token); // Refresh activity after send
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
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}> Delete & apos; {name}& apos; Wallet ? </span>
                < span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }
                }> This action is irreversible.All access via this dashboard will be lost.</span>
                < div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                        Cancel
                    </button>
                    < button
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

    return {
        wallets,
        isLoading,
        syncCountdown,
        selectedWallet,
        selectedWalletBalance,
        selectedWalletLoading,
        selectedWalletHistory,
        ltcUsdRate,
        openWalletDetails,
        closeWalletDetails: () => setSelectedWallet(null),
        handleSendLTC,
        handleCreateWallet,
        handleDeleteWallet,
        submitEditWallet,
        handleLogout,
        activityHistory,
        fetchActivityHistory: () => token && fetchActivityHistory(token)
    };
}
