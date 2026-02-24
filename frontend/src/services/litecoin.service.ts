import axios from 'axios';

const BLOCKCYPHER_API = 'https://api.blockcypher.com/v1/ltc/main';

export class LitecoinService {
    static async getAddressDetails(publicAddress: string) {
        const response = await axios.get(`${BLOCKCYPHER_API}/addrs/${publicAddress}`);
        return response.data;
    }

    static async getBalance(publicAddress: string) {
        const response = await axios.get(`${BLOCKCYPHER_API}/addrs/${publicAddress}/balance`);
        return response.data;
    }
}
