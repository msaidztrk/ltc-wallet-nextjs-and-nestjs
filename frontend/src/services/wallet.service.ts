import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class WalletService {
    static async getWallets(token: string) {
        const response = await axios.get(`${BACKEND_URL}/wallets`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }

    static async createWallet(token: string, name: string) {
        const response = await axios.post(`${BACKEND_URL}/wallets`, { name }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }

    static async deleteWallet(token: string, id: string) {
        const response = await axios.delete(`${BACKEND_URL}/wallets/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }

    static async renameWallet(token: string, id: string, name: string) {
        const response = await axios.patch(`${BACKEND_URL}/wallets/${id}`, { name }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
}
