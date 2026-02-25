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
}
