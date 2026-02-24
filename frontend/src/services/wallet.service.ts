import { apiClient } from '../lib/apiClient';

export class WalletService {
    static async getWallets(token: string) {
        return apiClient.get('/wallets', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    }

    static async createWallet(token: string, name: string) {
        return apiClient.post('/wallets', { name }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    }

    static async deleteWallet(token: string, id: string) {
        return apiClient.delete(`/wallets/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    }

    static async renameWallet(token: string, id: string, name: string) {
        return apiClient.patch(`/wallets/${id}`, { name }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    }

    static async sendLTC(token: string, id: string, toAddress: string, amount: number) {
        return apiClient.post(`/wallets/${id}/send`, { toAddress, amount }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    }
}
