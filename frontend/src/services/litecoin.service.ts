import axios from 'axios';
import toast from 'react-hot-toast';
import { BLOCKCYPHER_API_URL, BINANCE_API_URL } from '../lib/constants';

const blockcypherAxios = axios.create();

blockcypherAxios.interceptors.response.use(
    (response) => {
        if (typeof window !== 'undefined') {
            const remaining = response.headers['x-ratelimit-remaining'];
            if (remaining !== undefined) {
                window.dispatchEvent(new CustomEvent('apiRateLimitUpdate', { detail: Number(remaining) }));
            }
        }
        return response;
    },
    (error) => {
        if (typeof window !== 'undefined') {
            if (error.response && error.response.status === 429) {
                window.dispatchEvent(new CustomEvent('apiRateLimitUpdate', { detail: 0 }));
            }
            else if (error.message === 'Network Error') {
                window.dispatchEvent(new CustomEvent('apiRateLimitUpdate', { detail: 0 }));
            }
        }
        return Promise.reject(error);
    }
);

export class LitecoinService {
    private static utxoCache: Map<string, { source: 'blockcypher' | 'litecoinspace', utxos: any[], timestamp: number }> = new Map();

    static async getAddressDetails(publicAddress: string) {
        return blockcypherAxios.get(`${BLOCKCYPHER_API_URL}/addrs/${publicAddress}`)
            .then(res => res.data)
            .catch(async e => {
                const isRateLimited = (e.response && (e.response.status === 429 || e.response.status === 403)) || e.message === 'Network Error';

                if (isRateLimited) {
                    try {
                        const res = await axios.get(`https://litecoinspace.org/api/address/${publicAddress}`);
                        const lsData = res.data;
                        const balanceSats = (lsData.chain_stats.funded_txo_sum - lsData.chain_stats.spent_txo_sum) +
                            (lsData.mempool_stats.funded_txo_sum - lsData.mempool_stats.spent_txo_sum);

                        const txsRes = await axios.get(`https://litecoinspace.org/api/address/${publicAddress}/txs`);
                        const txrefs = txsRes.data.map((tx: any) => {
                            let valueDiff = 0;
                            if (tx.vout) {
                                for (const out of tx.vout) {
                                    if (out.scriptpubkey_address === publicAddress) valueDiff += out.value;
                                }
                            }
                            if (tx.vin) {
                                for (const input of tx.vin) {
                                    if (input.prevout && input.prevout.scriptpubkey_address === publicAddress) {
                                        valueDiff -= input.prevout.value;
                                    }
                                }
                            }
                            const isReceived = valueDiff > 0;
                            return {
                                tx_hash: tx.txid,
                                tx_input_n: isReceived ? -1 : 0,
                                value: Math.abs(valueDiff),
                                confirmed: tx.status.confirmed ? new Date(tx.status.block_time * 1000).toISOString() : null
                            };
                        });

                        return {
                            final_balance: balanceSats,
                            txrefs: txrefs
                        };
                    } catch (lsError) {
                        toast.error('Network Error: Both Blockcypher and Fallback APIs failed');
                        return null;
                    }
                }

                console.error(e);
                toast.error('Network Error: Failed to fetch blockchain data');
                return null;
            });
    }

    static async getBalance(publicAddress: string) {
        return blockcypherAxios.get(`${BLOCKCYPHER_API_URL}/addrs/${publicAddress}/balance`)
            .then(res => res.data)
            .catch(async (e) => {
                const isRateLimited = (e.response && (e.response.status === 429 || e.response.status === 403)) || e.message === 'Network Error';

                if (isRateLimited) {
                    try {
                        const res = await axios.get(`https://litecoinspace.org/api/address/${publicAddress}`);
                        const lsData = res.data;
                        const balanceSats = (lsData.chain_stats.funded_txo_sum - lsData.chain_stats.spent_txo_sum) +
                            (lsData.mempool_stats.funded_txo_sum - lsData.mempool_stats.spent_txo_sum);
                        return { final_balance: balanceSats };
                    } catch (lsError) {
                        return null;
                    }
                }
                return null;
            });
    }

    static async getLtcToUsdRate() {
        return axios.get(`${BINANCE_API_URL}/ticker/price?symbol=LTCUSDT`)
            .then(res => parseFloat(res.data.price))
            .catch(() => null);
    }

    static async getEstimatedFee(publicAddress: string, amountToSendLtc: number): Promise<number | null> {
        // Check cache to avoid spamming the API on every keystroke
        const cached = this.utxoCache.get(publicAddress);
        if (cached && Date.now() - cached.timestamp < 60000) { // 60-second cache
            if (cached.source === 'blockcypher') {
                return LitecoinService.calculateFeeFromBlockcypherUTXOs(cached.utxos, amountToSendLtc);
            } else {
                return LitecoinService.calculateFeeFromLitecoinspaceUTXOs(cached.utxos, amountToSendLtc);
            }
        }

        return blockcypherAxios.get(`${BLOCKCYPHER_API_URL}/addrs/${publicAddress}?unspentOnly=true`)
            .then(res => {
                const utxos = res.data.txrefs || [];
                this.utxoCache.set(publicAddress, { source: 'blockcypher', utxos, timestamp: Date.now() });
                return LitecoinService.calculateFeeFromBlockcypherUTXOs(utxos, amountToSendLtc);
            })
            .catch(async e => {
                const isRateLimited = (e.response && (e.response.status === 429 || e.response.status === 403)) || e.message === 'Network Error';

                if (isRateLimited) {
                    try {
                        const lsRes = await axios.get(`https://litecoinspace.org/api/address/${publicAddress}/utxo`);
                        const utxos = lsRes.data || [];
                        this.utxoCache.set(publicAddress, { source: 'litecoinspace', utxos, timestamp: Date.now() });
                        return LitecoinService.calculateFeeFromLitecoinspaceUTXOs(utxos, amountToSendLtc);
                    } catch (lsError) {
                        return null;
                    }
                }
                console.error('Fee estimation failed:', e);
                return null;
            });
    }

    private static calculateFeeFromBlockcypherUTXOs(utxos: any[], amountToSendLtc: number): number | null {
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

        if (totalAvailableSats < amountToSendSats + dynamicFeeSats) return null;
        return dynamicFeeSats / 100000000;
    }

    private static calculateFeeFromLitecoinspaceUTXOs(utxos: any[], amountToSendLtc: number): number | null {
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

        if (totalAvailableSats < amountToSendSats + dynamicFeeSats) return null;
        return dynamicFeeSats / 100000000;
    }
}
