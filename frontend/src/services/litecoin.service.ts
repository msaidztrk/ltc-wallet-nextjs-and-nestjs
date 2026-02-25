import axios from 'axios';
import toast from 'react-hot-toast';
import { BLOCKCYPHER_API_URL, BINANCE_API_URL } from '../lib/constants';

export class LitecoinService {
    static async getAddressDetails(publicAddress: string) {
        return axios.get(`${BLOCKCYPHER_API_URL}/addrs/${publicAddress}`)
            .then(res => res.data)
            .catch(e => {
                console.error(e);
                toast.error('Network Error: Failed to fetch blockchain data');
                return null;
            });
    }

    static async getBalance(publicAddress: string) {
        return axios.get(`${BLOCKCYPHER_API_URL}/addrs/${publicAddress}/balance`)
            .then(res => res.data)
            .catch(() => null);
    }

    static async getLtcToUsdRate() {
        return axios.get(`${BINANCE_API_URL}/ticker/price?symbol=LTCUSDT`)
            .then(res => parseFloat(res.data.price))
            .catch(() => null);
    }

    static async getEstimatedFee(publicAddress: string, amountToSendLtc: number): Promise<number | null> {
        try {
            const res = await axios.get(`${BLOCKCYPHER_API_URL}/addrs/${publicAddress}?unspentOnly=true`);
            const utxos = res.data.txrefs || [];

            const amountToSendSats = Math.floor(amountToSendLtc * 100000000);
            let totalAvailableSats = 0;
            let dynamicFeeSats = 2000;
            const feeRatePerByte = 10;
            const baseOutputBytes = (2 * 34) + 10;
            let inputsUsedCount = 0;

            for (const utxo of utxos) {
                inputsUsedCount++;
                dynamicFeeSats = (baseOutputBytes + (inputsUsedCount * 148)) * feeRatePerByte;
                totalAvailableSats += utxo.value;

                if (totalAvailableSats >= amountToSendSats + dynamicFeeSats) break;
            }

            if (totalAvailableSats < amountToSendSats + dynamicFeeSats) {
                return null;
            }

            return dynamicFeeSats / 100000000;
        } catch (e) {
            console.error('Fee estimation failed:', e);
            return null;
        }
    }
}
