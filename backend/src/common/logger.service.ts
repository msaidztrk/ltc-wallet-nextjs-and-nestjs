import { Injectable, Logger } from '@nestjs/common';
import { LogRepository } from './log.repository';

@Injectable()
export class LoggerService {
    private readonly logger = new Logger(LoggerService.name);

    constructor(private readonly logRepository: LogRepository) { }

    async logTransaction(userId: string, walletId: string, txHash: string, amount: number, type: 'send' | 'receive', token: string) {
        const { error } = await this.logRepository.createTransactionLog({
            user_id: userId,
            wallet_id: walletId,
            tx_hash: txHash,
            amount,
            type,
            status: 'broadcasted'
        }, token);

        if (error) {
            this.logger.error(`Failed to log transaction to Supabase: ${error.message}`);
        } else {
            this.logger.log(`Transaction ${txHash} logged successfully for user ${userId}`);
        }
    }

    async logError(userId: string | null, context: string, message: string, stack?: string, token?: string) {
        this.logger.error(`[${context}] ${message}`);

        const { error } = await this.logRepository.createErrorLog({
            user_id: userId,
            context,
            error_message: message,
            stack_trace: stack
        }, token);

        if (error) {
            this.logger.error(`Failed to log error to Supabase: ${error.message}`);
        }
    }

    async getLogs(userId: string, token: string) {
        return await this.logRepository.getTransactionLogsByUserId(userId, token);
    }
}
