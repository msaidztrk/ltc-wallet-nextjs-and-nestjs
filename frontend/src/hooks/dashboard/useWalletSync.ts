import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { WalletService } from '../../services/wallet.service';
import { Wallet } from '../../types/wallet.types';
import { useTranslation } from '../useTranslation';
import { useSettings } from '../useSettings';

export function useWalletSync(wallets: Wallet[], setWallets: React.Dispatch<React.SetStateAction<Wallet[]>>, token: string | null) {
    const { settings } = useSettings();
    const syncInterval = settings.sync_interval || 120;
    const [syncCountdown, setSyncCountdown] = useState(syncInterval);
    const [apiRateLimitRemaining, setApiRateLimitRemaining] = useState<number | null>(null);
    const [apiRateLimitResetTime, setApiRateLimitResetTime] = useState<number | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const handleRateLimitUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<number>;
            setApiRateLimitRemaining(customEvent.detail);
            if (customEvent.detail === 0) {
                toast.error(t('api_limit_reached'), { id: 'rate-limit-toast' });
            }
        };
        window.addEventListener('apiRateLimitUpdate', handleRateLimitUpdate);
        return () => window.removeEventListener('apiRateLimitUpdate', handleRateLimitUpdate);
    }, [t]);

    useEffect(() => {
        if (wallets.length === 0) return;

        let isSyncing = false;

        const updateBalancesSequentially = async () => {
            isSyncing = true;
            let freshWallets: Wallet[] = [];
            const { data: { session } } = await supabase.auth.getSession();
            const activeToken = session?.access_token;

            if (!activeToken) {
                freshWallets = [...wallets];
            } else {
                const dbData = await WalletService.getWallets(activeToken);
                freshWallets = dbData?.data ? dbData.data : [...wallets];
            }

            let stateUpdated = false;
            const fetchedBalances: Record<string, string> = {};

            for (let i = 0; i < freshWallets.length; i++) {
                if (!activeToken) break;
                const response: any = await WalletService.getWalletBalance(activeToken, freshWallets[i].id);

                if (!response || response.status === 'error') {
                    if (response?.reason === 'rate_limit') {
                        setApiRateLimitRemaining(0);
                        if (response.resetTime) setApiRateLimitResetTime(response.resetTime);
                        toast.error(t('api_limit_reached'), { id: 'rate-limit-toast' });
                    }
                    break;
                }

                if (response.status === 'success') {
                    if (response.apiLimit !== null && response.apiLimit !== undefined) {
                        setApiRateLimitRemaining(response.apiLimit);
                        if (response.resetTime) setApiRateLimitResetTime(response.resetTime);
                        if (response.apiLimit === 0) {
                            toast.error(t('api_limit_reached'), { id: 'rate-limit-toast' });
                        }
                    }
                    if (response.balance !== undefined) {
                        fetchedBalances[freshWallets[i].id] = (response.balance / 100000000).toFixed(8) + ' LTC';
                        stateUpdated = true;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1200));
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
        setSyncCountdown(syncInterval);

        let countdownTimer = syncInterval;

        const tick = () => {
            countdownTimer -= 1;

            if (countdownTimer <= 0) {
                if (!isSyncing) updateBalancesSequentially();
                countdownTimer = syncInterval;
            }

            setSyncCountdown(countdownTimer);
        };

        const intervalId = setInterval(tick, 1000);
        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallets.length, token, syncInterval, t]);

    return { syncCountdown, apiRateLimitRemaining, apiRateLimitResetTime };
}
