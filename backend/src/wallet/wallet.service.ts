import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { CryptoService } from '../crypto/crypto.service';
import { SupabaseService } from '../supabase/supabase.service';

const bip32 = BIP32Factory(ecc);

const LITECOIN_NETWORK = {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: {
        public: 0x019da462,
        private: 0x019d9cfe,
    },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
};

@Injectable()
export class WalletService {
    constructor(
        private readonly cryptoManager: CryptoService,
        private readonly databaseManager: SupabaseService,
    ) { }

    async createWalletRecord(authenticatedUserId: string, walletIdentifierName: string, jwtToken: string) {
        try {
            const newlyGeneratedMnemonicSeed = bip39.generateMnemonic();
            const rootSeedBuffer = await bip39.mnemonicToSeed(newlyGeneratedMnemonicSeed);

            const rootDeterministicPrivateKey = bip32.fromSeed(rootSeedBuffer, LITECOIN_NETWORK);

            const standardDerivationPath = "m/44'/2'/0'/0/0";
            const derivedChildKey = rootDeterministicPrivateKey.derivePath(standardDerivationPath);

            const generatedLitecoinAddress = bitcoin.payments.p2pkh({
                pubkey: derivedChildKey.publicKey,
                network: LITECOIN_NETWORK,
            }).address;

            const securelyEncryptedMnemonic = this.cryptoManager.encryptData(newlyGeneratedMnemonicSeed);

            const { data: insertedWalletRecord, error: databaseInsertionError } = await this.databaseManager.getClient(jwtToken)
                .from('wallets')
                .insert([
                    {
                        user_id: authenticatedUserId,
                        name: walletIdentifierName,
                        encrypted_mnemonic: securelyEncryptedMnemonic,
                    },
                ])
                .select()
                .single();

            if (databaseInsertionError) {
                console.error('Supabase Insertion Error:', databaseInsertionError);
                throw databaseInsertionError;
            }

            return {
                id: insertedWalletRecord.id,
                name: insertedWalletRecord.name,
                public_address: generatedLitecoinAddress,
                created_at: insertedWalletRecord.created_at,
            };
        } catch (walletCreationException) {
            console.error('Wallet generation failed:', walletCreationException);
            throw new InternalServerErrorException('Wallet generation process failed');
        }
    }

    async retrieveWalletsForUser(authenticatedUserId: string, jwtToken: string) {
        try {
            const { data: retrievedWalletsDatabaseQuery, error: databaseSelectionError } = await this.databaseManager.getClient(jwtToken)
                .from('wallets')
                .select('id, name, created_at, encrypted_mnemonic')
                .eq('user_id', authenticatedUserId);

            if (databaseSelectionError) throw databaseSelectionError;

            const detailedWallets = await Promise.all(retrievedWalletsDatabaseQuery.map(async (wallet) => {
                const decryptedMnemonic = this.cryptoManager.decryptData(wallet.encrypted_mnemonic);
                const rootSeedBuffer = await bip39.mnemonicToSeed(decryptedMnemonic);
                const rootDeterministicPrivateKey = bip32.fromSeed(rootSeedBuffer, LITECOIN_NETWORK);
                const standardDerivationPath = "m/44'/2'/0'/0/0";
                const derivedChildKey = rootDeterministicPrivateKey.derivePath(standardDerivationPath);
                const publicAddress = bitcoin.payments.p2pkh({
                    pubkey: derivedChildKey.publicKey,
                    network: LITECOIN_NETWORK,
                }).address;

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
            const { data: updatedWalletRecordQuery, error: databaseUpdateError } = await this.databaseManager.getClient(jwtToken)
                .from('wallets')
                .update({ name: updatedWalletIdentifierName })
                .eq('id', targetWalletId)
                .eq('user_id', authenticatedUserId)
                .select('id, name, created_at')
                .single();

            if (databaseUpdateError) throw databaseUpdateError;

            return updatedWalletRecordQuery;
        } catch (updateException) {
            throw new InternalServerErrorException('Failed to update wallet name');
        }
    }

    async removeWalletRecord(authenticatedUserId: string, targetWalletId: string, jwtToken: string) {
        try {
            const { error: databaseDeletionError } = await this.databaseManager.getClient(jwtToken)
                .from('wallets')
                .delete()
                .eq('id', targetWalletId)
                .eq('user_id', authenticatedUserId);

            if (databaseDeletionError) throw databaseDeletionError;

            return { isDeleted: true, targetWalletDeletedId: targetWalletId };
        } catch (deletionException) {
            throw new InternalServerErrorException('Failed to delete target wallet record');
        }
    }
}
