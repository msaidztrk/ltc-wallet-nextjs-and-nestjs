import { useState, useEffect } from 'react';
import { LitecoinService } from '../services/litecoin.service';

interface UseFeeCalculatorResult {
    estimatedFee: number | null;
    isEstimatingFee: boolean;
    currentBalanceNum: number;
    sendAmountNum: number;
    isCalculating: boolean;
    remainingLtcNum: number;
    isInsufficientFunds: boolean;
}

export const useFeeCalculator = (publicAddress: string, sendAmountStr: string, balanceStr: string | null): UseFeeCalculatorResult => {
    const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
    const [isEstimatingFee, setIsEstimatingFee] = useState(false);

    useEffect(() => {
        const amountNum = parseFloat(sendAmountStr);
        if (isNaN(amountNum) || amountNum <= 0) {
            const timer = setTimeout(() => {
                setEstimatedFee(null);
                setIsEstimatingFee(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        const timer = setTimeout(async () => {
            setIsEstimatingFee(true);
            const fee = await LitecoinService.getEstimatedFee(publicAddress, amountNum);
            setEstimatedFee(fee);
            setIsEstimatingFee(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [sendAmountStr, publicAddress]);

    const currentBalanceNum = balanceStr ? parseFloat(balanceStr) : 0;
    const sendAmountNum = sendAmountStr ? parseFloat(sendAmountStr) : 0;
    const isCalculating = sendAmountNum > 0;
    const remainingLtcNum = estimatedFee !== null ? currentBalanceNum - (sendAmountNum + estimatedFee) : -1;
    const isInsufficientFunds = isCalculating && !isEstimatingFee && (estimatedFee === null || remainingLtcNum < 0);

    return {
        estimatedFee,
        isEstimatingFee,
        currentBalanceNum,
        sendAmountNum,
        isCalculating,
        remainingLtcNum,
        isInsufficientFunds
    };
};
