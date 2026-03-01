import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { CryptoService } from '../crypto/crypto.service';
import { WalletRepository } from './wallet.repository';
import { ECPairFactory } from 'ecpair';
import axios from 'axios';
import { LITECOIN_NETWORK, BLOCKCYPHER_BASE_URL } from '../common/constants';
import { LoggerService } from '../common/logger.service';
import { CurrencyUtils } from '../common/utils/currency.utils';
import { WalletTransactionService } from './wallet-transaction.service';
import { BlockchainService } from './services/blockchain.service';

const ECPair = ECPairFactory(ecc);

const bip32 = BIP32Factory(ecc);

@Injectable()
export class WalletService {
    constructor(
        private readonly cryptoManager: CryptoService,
        private readonly walletRepository: WalletRepository,
        private readonly loggerService: LoggerService,
        private readonly txService: WalletTransactionService,
        private readonly blockchainService: BlockchainService,
    ) { }

    private async getWalletKeysAndAddress(mnemonic: string) {
        const rootSeedBuffer = await bip39.mnemonicToSeed(mnemonic);
        const rootDeterministicPrivateKey = bip32.fromSeed(rootSeedBuffer, LITECOIN_NETWORK);
        const derivedChildKey = rootDeterministicPrivateKey.derivePath("m/44'/2'/0'/0/0");

        if (!derivedChildKey.privateKey) {
            throw new InternalServerErrorException('Private key could not be derived from the mnemonic seed.');
        }

        const keyPair = ECPair.fromPrivateKey(derivedChildKey.privateKey, { network: LITECOIN_NETWORK });
        const p2pkhPayment = bitcoin.payments.p2pkh({
            pubkey: keyPair.publicKey,
            network: LITECOIN_NETWORK,
        });

        return {
            keyPair,
            publicAddress: p2pkhPayment.address as string,
        };
    }

    async createWalletRecord(authenticatedUserId: string, walletIdentifierName: string, jwtToken: string) {
        try {
            const newlyGeneratedMnemonicSeed = bip39.generateMnemonic();
            const { publicAddress } = await this.getWalletKeysAndAddress(newlyGeneratedMnemonicSeed);

            const securelyEncryptedMnemonic = this.cryptoManager.encryptData(newlyGeneratedMnemonicSeed);

            const insertedWalletRecord = await this.walletRepository.createWallet(authenticatedUserId, walletIdentifierName, securelyEncryptedMnemonic, jwtToken);

            return {
                id: insertedWalletRecord.id,
                name: insertedWalletRecord.name,
                public_address: publicAddress,
                created_at: insertedWalletRecord.created_at,
            };
        } catch (walletCreationException) {
            console.error('Wallet generation failed:', walletCreationException);
            throw new InternalServerErrorException('Wallet generation process failed');
        }
    }

    async retrieveWalletsForUser(authenticatedUserId: string, jwtToken: string) {
        try {
            const retrievedWalletsDatabaseQuery = await this.walletRepository.findWalletsByUserId(authenticatedUserId, jwtToken);

            const detailedWallets = await Promise.all(retrievedWalletsDatabaseQuery.map(async (wallet) => {
                const decryptedMnemonic = this.cryptoManager.decryptData(wallet.encrypted_mnemonic);
                const { publicAddress } = await this.getWalletKeysAndAddress(decryptedMnemonic);

                return {
                    id: wallet.id,
                    name: wallet.name,
                    public_address: publicAddress,
                    created_at: wallet.created_at
                };
            }));

            return detailedWallets;
        } catch (fetchException) {
            console.error('Wallet retrieval failed:', fetchException);
            throw new InternalServerErrorException('Failed to retrieve wallets');
        }
    }

    async modifyWalletName(authenticatedUserId: string, targetWalletId: string, updatedWalletIdentifierName: string, jwtToken: string) {
        try {
            const updatedWalletRecordQuery = await this.walletRepository.updateWalletName(targetWalletId, authenticatedUserId, updatedWalletIdentifierName, jwtToken);

            return updatedWalletRecordQuery;
        } catch (updateException) {
            throw new InternalServerErrorException('Failed to update wallet name');
        }
    }

    async removeWalletRecord(authenticatedUserId: string, targetWalletId: string, jwtToken: string) {
        try {
            await this.walletRepository.deleteWallet(targetWalletId, authenticatedUserId, jwtToken);

            return { isDeleted: true, targetWalletDeletedId: targetWalletId };
        } catch (deletionException) {
            throw new InternalServerErrorException('Failed to delete target wallet record');
        }
    }

    async sendLitecoinTransaction(authenticatedUserId: string, targetWalletId: string, toAddress: string, amountToSend: number, jwtToken: string) {
        try {
            const walletData = await this.walletRepository.findWalletByIdAndUserId(targetWalletId, authenticatedUserId, jwtToken);

            const decryptedMnemonic = this.cryptoManager.decryptData(walletData.encrypted_mnemonic);
            const { keyPair, publicAddress: myAddress } = await this.getWalletKeysAndAddress(decryptedMnemonic);

            const amountToSendSats = CurrencyUtils.ltcToSats(amountToSend);

            const utxos = await this.txService.fetchActiveUTXOs(myAddress);

            const rawTransactionHex = await this.txService.createSignedTransactionHex(utxos, amountToSendSats, toAddress, myAddress, keyPair);

            const pushResponseData = await this.txService.broadcastRawTransaction(rawTransactionHex);
            const txHash = pushResponseData.tx.hash;

            await this.loggerService.logTransaction(
                authenticatedUserId,
                targetWalletId,
                txHash,
                amountToSend,
                'send',
                jwtToken
            );

            return {
                status: 'success',
                data: {
                    tx_hash: txHash,
                    amount_sent: amountToSend,
                    to_address: toAddress
                }
            };

        } catch (error) {
            console.error('LTC Node Broadcasting Failed:', error?.response?.data || error.message);
            const errorMessage = error?.response?.data?.error || error.message || 'Transaction broadcasting failed on the node';
            throw new InternalServerErrorException(errorMessage);
        }
    }


    async getTransactionHistory(authenticatedUserId: string, jwtToken: string) {
        const { data, error } = await this.loggerService.getLogs(authenticatedUserId, jwtToken);
        if (error) {
            throw new InternalServerErrorException('Could not fetch transaction history');
        }
        return data;
    }

    async checkApiRateLimit() {
        try {
            await this.blockchainService.pingBlockcypherApi();
            return {
                status: 'success',
                remaining: this.blockchainService.getAndIncrementHourlyLimit(),
                resetTime: this.blockchainService.getApiResetTime()
            };
        } catch (error) {
            if (error.response && error.response.status === 429) {
                return { status: 'success', remaining: 0, resetTime: this.blockchainService.getApiResetTime() };
            }
            throw new InternalServerErrorException('Could not check API rate limit');
        }
    }

    async getWalletBalanceFromBlockchain(authenticatedUserId: string, targetWalletId: string, jwtToken: string) {
        try {
            const walletData = await this.walletRepository.findWalletByIdAndUserId(targetWalletId, authenticatedUserId, jwtToken);
            const decryptedMnemonic = this.cryptoManager.decryptData(walletData.encrypted_mnemonic);
            const { publicAddress } = await this.getWalletKeysAndAddress(decryptedMnemonic);

            let remaining = this.blockchainService.getAndIncrementHourlyLimit();
            let balanceSats = 0;

            try {
                balanceSats = await this.blockchainService.getBlockcypherBalance(publicAddress);
            } catch (blockError) {
                if (blockError.response && blockError.response.status === 429) {
                    remaining = 0;
                    throw blockError;
                }
                throw blockError;
            }

            return {
                status: 'success',
                balance: balanceSats,
                apiLimit: remaining,
                resetTime: this.blockchainService.getApiResetTime()
            };
        } catch (error) {
            console.error('getWalletBalanceFromBlockchain Error:', error?.response?.data || error.message);
            if (error.response && error.response.status === 429) {
                return { status: 'error', reason: 'rate_limit', apiLimit: 0, resetTime: this.blockchainService.getApiResetTime() };
            }
            throw new InternalServerErrorException('Failed to fetch balance from blockchain node');
        }
    }
}
