import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BLOCKCYPHER_BASE_URL } from '../../common/constants';

@Injectable()
export class BlockchainService {
    private hourlyApiCounter = 0;
    private hourlyApiResetTime = Date.now() + 3600000; // 1 hr from now
    private blockcypherBannedUntil = 0;

    getAndIncrementHourlyLimit(): number {
        const now = Date.now();
        
        if (now < this.blockcypherBannedUntil) {
            return 0; // Directly report 0 if currently banned
        }

        if (now > this.hourlyApiResetTime) {
            this.hourlyApiCounter = 0;
            this.hourlyApiResetTime = now + 3600000;
        }
        this.hourlyApiCounter++;
        return Math.max(0, 200 - this.hourlyApiCounter);
    }

    markAsBanned(): void {
        this.blockcypherBannedUntil = Date.now() + 3600000; // Ban for 1 hour from now
        this.hourlyApiResetTime = this.blockcypherBannedUntil;
        this.hourlyApiCounter = 200; // Deplete counter
        console.warn(`[API LIMIT] Blockcypher 429 error! Banned until: ${new Date(this.blockcypherBannedUntil).toLocaleTimeString()}`);
    }

    getApiResetTime(): number {
        return this.hourlyApiResetTime;
    }

    async getBlockcypherBalance(publicAddress: string): Promise<number> {
        if (Date.now() < this.blockcypherBannedUntil) {
            throw { response: { status: 429 }, message: "Locally cached ban" };
        }
        const response = await axios.get(`${BLOCKCYPHER_BASE_URL}/addrs/${publicAddress}/balance`);
        return response.data.final_balance;
    }

    async getLitecoinSpaceBalance(publicAddress: string): Promise<number> {
        const response = await axios.get(`https://litecoinspace.org/api/address/${publicAddress}`);
        const lsData = response.data;
        return (lsData.chain_stats.funded_txo_sum - lsData.chain_stats.spent_txo_sum) +
            (lsData.mempool_stats.funded_txo_sum - lsData.mempool_stats.spent_txo_sum);
    }

    async pingBlockcypherApi(): Promise<void> {
        await axios.get(`${BLOCKCYPHER_BASE_URL}`);
    }
}
