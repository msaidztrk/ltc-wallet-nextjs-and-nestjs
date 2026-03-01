import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { WalletService } from '../../services/wallet.service';
import { LitecoinService } from '../../services/litecoin.service';
import { Wallet } from '../../types/wallet.types';

export function useWalletState() {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
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

    return {
        wallets,
        setWallets,
        isLoading,
        token,
        activityHistory,
        fetchActivityHistory,
        ltcUsdRate,
        router
    };
}
