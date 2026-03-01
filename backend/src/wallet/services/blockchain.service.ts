import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BLOCKCYPHER_BASE_URL } from '../../common/constants';

@Injectable()
export class BlockchainService {
    private hourlyApiCounter = 0;
    private hourlyApiResetTime = Date.now() + 3600000; // 1 hr from now

    getAndIncrementHourlyLimit(): number {
        const now = Date.now();
        if (now > this.hourlyApiResetTime) {
            this.hourlyApiCounter = 0;
            this.hourlyApiResetTime = now + 3600000; // 1 hr from now
        }
        this.hourlyApiCounter++;
        return Math.max(0, 200 - this.hourlyApiCounter);
    }

    getApiResetTime(): number {
        return this.hourlyApiResetTime;
    }

    async getBlockcypherBalance(publicAddress: string): Promise<number> {
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
