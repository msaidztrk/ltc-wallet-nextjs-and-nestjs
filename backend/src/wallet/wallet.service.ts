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

const ECPair = ECPairFactory(ecc);

const bip32 = BIP32Factory(ecc);

@Injectable()
export class WalletService {
    constructor(
        private readonly cryptoManager: CryptoService,
        private readonly walletRepository: WalletRepository,
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

    private async fetchActiveUTXOs(address: string) {
        const blockcypherResponse = await axios.get(`${BLOCKCYPHER_BASE_URL}/addrs/${address}?unspentOnly=true`);
        const utxos = blockcypherResponse.data.txrefs || [];

        if (utxos.length === 0) {
            throw new Error('Insufficient balance. No confirmed UTXOs found on the network.');
        }

        return utxos;
    }

    private async createSignedTransactionHex(utxos: any[], amountToSendSats: number, toAddress: string, myAddress: string, keyPair: any) {
        const psbt = new bitcoin.Psbt({ network: LITECOIN_NETWORK });
        let totalAvailableSats = 0;
        let dynamicFeeSats = 2000;
        const feeRatePerByte = 10;
        const baseOutputBytes = (2 * 34) + 10;
        let inputsUsedCount = 0;

        for (const utxo of utxos) {
            const rawTxResponse = await axios.get(`${BLOCKCYPHER_BASE_URL}/txs/${utxo.tx_hash}?includeHex=true`);

            psbt.addInput({
                hash: utxo.tx_hash,
                index: utxo.tx_output_n,
                nonWitnessUtxo: Buffer.from(rawTxResponse.data.hex, 'hex'),
            });

            inputsUsedCount++;
            dynamicFeeSats = (baseOutputBytes + (inputsUsedCount * 148)) * feeRatePerByte;
            totalAvailableSats += utxo.value;

            if (totalAvailableSats >= amountToSendSats + dynamicFeeSats) break;
        }

        if (totalAvailableSats < amountToSendSats + dynamicFeeSats) {
            throw new Error(`Insufficient LTC. Available: ${(totalAvailableSats / 100000000).toFixed(8)} | Required: ${((amountToSendSats + dynamicFeeSats) / 100000000).toFixed(8)}`);
        }

        psbt.addOutput({
            address: toAddress,
            value: BigInt(amountToSendSats),
        });

        const changeSats = totalAvailableSats - amountToSendSats - dynamicFeeSats;
        if (changeSats > 546) {
            psbt.addOutput({
                address: myAddress,
                value: BigInt(changeSats),
            });
        }

        psbt.signAllInputs(keyPair);
        psbt.finalizeAllInputs();

        return psbt.extractTransaction().toHex();
    }

    private async broadcastRawTransaction(rawTransactionHex: string) {
        const pushResponse = await axios.post(`${BLOCKCYPHER_BASE_URL}/txs/push`, {
            tx: rawTransactionHex
        });
        return pushResponse.data;
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

            const amountToSendSats = Math.floor(amountToSend * 100000000);

            const utxos = await this.fetchActiveUTXOs(myAddress);

            const rawTransactionHex = await this.createSignedTransactionHex(utxos, amountToSendSats, toAddress, myAddress, keyPair);

            const pushResponseData = await this.broadcastRawTransaction(rawTransactionHex);

            return {
                status: 'success',
                data: {
                    tx_hash: pushResponseData.tx.hash,
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
}
