import { useState } from 'react';
import { Wallet, TxRef } from '../../types/wallet.types';
import { LitecoinService } from '../../services/litecoin.service';

export function useWalletDetails() {
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [selectedWalletBalance, setSelectedWalletBalance] = useState<string | null>(null);
    const [selectedWalletLoading, setSelectedWalletLoading] = useState(false);
    const [selectedWalletHistory, setSelectedWalletHistory] = useState<TxRef[]>([]);

    const openWalletDetails = async (wallet: Wallet) => {
        setSelectedWallet(wallet);
        setSelectedWalletLoading(true);
        setSelectedWalletBalance(null);
        setSelectedWalletHistory([]);

        const data = await LitecoinService.getAddressDetails(wallet.public_address);
        if (data && data.final_balance !== undefined) {
            setSelectedWalletBalance((data.final_balance / 100000000).toFixed(8) + ' LTC');
            setSelectedWalletHistory(data.txrefs || []);
        } else {
            setSelectedWalletBalance('Error or 0 LTC');
        }

        setSelectedWalletLoading(false);
    };

    const closeWalletDetails = () => setSelectedWallet(null);

    return {
        selectedWallet,
        selectedWalletBalance,
        selectedWalletLoading,
        selectedWalletHistory,
        openWalletDetails,
        closeWalletDetails
    };
}
