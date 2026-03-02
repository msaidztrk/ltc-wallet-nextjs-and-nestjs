import { useWalletState } from './dashboard/useWalletState';
import { useWalletSync } from './dashboard/useWalletSync';
import { useWalletDetails } from './dashboard/useWalletDetails';
import { useWalletActions } from './dashboard/useWalletActions';
import { supabase } from '../lib/supabase';

export function useDashboardWallets() {
    const state = useWalletState();
    const sync = useWalletSync(state.wallets, state.setWallets, state.token, state.fetchLtcRate);
    const details = useWalletDetails();
    const actions = useWalletActions(
        state.setWallets,
        state.fetchActivityHistory,
        details.selectedWallet,
        details.openWalletDetails,
        state.router
    );

    return {
        wallets: state.wallets,
        isLoading: state.isLoading,
        ltcUsdRate: state.ltcUsdRate,
        activityHistory: state.activityHistory,
        fetchActivityHistory: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) state.fetchActivityHistory(session.access_token);
        },
        ...sync,
        ...details,
        ...actions
    };
}
