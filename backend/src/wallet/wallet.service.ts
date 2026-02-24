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

    async createWalletRecord(authenticatedUserId: string, walletIdentifierName: string) {
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

            const { data: insertedWalletRecord, error: databaseInsertionError } = await this.databaseManager.databaseClient
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

            if (databaseInsertionError) throw databaseInsertionError;

            return {
                id: insertedWalletRecord.id,
                walletName: insertedWalletRecord.name,
                publicAddress: generatedLitecoinAddress,
                createdAt: insertedWalletRecord.created_at,
            };
        } catch (walletCreationException) {
            throw new InternalServerErrorException('Wallet generation process failed');
        }
    }
}
