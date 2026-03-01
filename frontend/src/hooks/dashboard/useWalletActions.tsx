import { supabase } from '../../lib/supabase';
import { WalletService } from '../../services/wallet.service';
import { Wallet } from '../../types/wallet.types';
import toast from 'react-hot-toast';
import { useTranslation } from '../useTranslation';

export function useWalletActions(
    setWallets: React.Dispatch<React.SetStateAction<Wallet[]>>,
    fetchActivityHistory: (token: string) => Promise<void>,
    selectedWallet: Wallet | null,
    openWalletDetails: (wallet: Wallet) => Promise<void>,
    router: any
) {
    const { t } = useTranslation();

    const handleSendLTC = async (address: string, amount: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const activeToken = session?.access_token;
        if (!activeToken || !selectedWallet) return false;

        const result = await WalletService.sendLTC(activeToken, selectedWallet.id, address, parseFloat(amount));
        if (result) {
            toast.success(t('send_success', { amount }));
            openWalletDetails(selectedWallet);
            fetchActivityHistory(activeToken);

            // Fetch new balance immediately to update the dashboard UI instantly
            setTimeout(async () => {
                try {
                    const balanceRes: any = await WalletService.getWalletBalance(activeToken, selectedWallet.id);
                    if (balanceRes && balanceRes.status === 'success' && balanceRes.balance !== undefined) {
                        setWallets((prev) => prev.map((w) =>
                            w.id === selectedWallet.id ? { ...w, liveBalance: (balanceRes.balance / 100000000).toFixed(8) + ' LTC' } : w
                        ));
                    }
                } catch (e) {
                    console.error('Failed to sync fast balance after sending:', e);
                }
            }, 1000); // Wait 1 second for mempool indexing 

            return true;
        }
        return false;
    };

    const handleCreateWallet = async (name: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const activeToken = session?.access_token;
        if (!activeToken) return;

        const result = await WalletService.createWallet(activeToken, name);
        if (result && result.data) {
            setWallets((prev) => [...prev, result.data]);
            toast.success(t('wallet_generated'));
        }
    };

    const handleDeleteWallet = async (id: string, name: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const activeToken = session?.access_token;
        if (!activeToken) return;

        toast((tObj) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}> {t('delete_confirm_title', { name })} </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> {t('action_irreversible')}</span>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                        onClick={() => toast.dismiss(tObj.id)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(tObj.id);
                            const result = await WalletService.deleteWallet(activeToken, id);
                            if (result) {
                                setWallets((prev) => prev.filter((w) => w.id !== id));
                                toast.success(t('wallet_deleted'));
                            }
                        }}
                        style={{ background: 'rgba(255,60,60,0.2)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '4px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        {t('confirm_delete')}
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    const submitEditWallet = async (id: string, newName: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const activeToken = session?.access_token;
        if (!activeToken) return;

        const result = await WalletService.renameWallet(activeToken, id, newName);
        if (result) {
            setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, name: newName } : w)));
            toast.success(t('wallet_renamed'));
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    return {
        handleSendLTC,
        handleCreateWallet,
        handleDeleteWallet,
        submitEditWallet,
        handleLogout
    };
}
