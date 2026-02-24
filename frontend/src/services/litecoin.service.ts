import axios from 'axios';
import toast from 'react-hot-toast';

const BLOCKCYPHER_API = 'https://api.blockcypher.com/v1/ltc/main';

export class LitecoinService {
    static async getAddressDetails(publicAddress: string) {
        return axios.get(`${BLOCKCYPHER_API}/addrs/${publicAddress}`)
            .then(res => res.data)
            .catch(e => {
                console.error(e);
                toast.error('Network Error: Failed to fetch blockchain data');
                return null;
            });
    }

    static async getBalance(publicAddress: string) {
        return axios.get(`${BLOCKCYPHER_API}/addrs/${publicAddress}/balance`)
            .then(res => res.data)
            .catch(() => null);
    }

    static async getLtcToUsdRate() {
        return axios.get('https://api.binance.com/api/v3/ticker/price?symbol=LTCUSDT')
            .then(res => parseFloat(res.data.price))
            .catch(() => null);
    }
}
