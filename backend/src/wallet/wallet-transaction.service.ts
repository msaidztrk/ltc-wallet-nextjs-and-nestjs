import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import { LITECOIN_NETWORK, BLOCKCYPHER_BASE_URL } from '../common/constants';
import { CurrencyUtils } from '../common/utils/currency.utils';

@Injectable()
export class WalletTransactionService {


    async fetchActiveUTXOs(address: string) {
        let utxos = [];
        try {
            const bcRes = await axios.get(`${BLOCKCYPHER_BASE_URL}/addrs/${address}?unspentOnly=true`);
            const bcUtxos = bcRes.data.txrefs || [];
            utxos = bcUtxos.map(u => ({ tx_hash: u.tx_hash, tx_output_n: u.tx_output_n, value: u.value }));
        } catch (error) {
            console.warn('[FALLBACK] Blockcypher failed, using Litecoinspace for UTXOs');
            const lsRes = await axios.get(`https://litecoinspace.org/api/address/${address}/utxo`);
            utxos = lsRes.data.map(u => ({ tx_hash: u.txid, tx_output_n: u.vout, value: u.value }));
        }

        if (utxos.length === 0) {
            throw new Error('Insufficient balance. No confirmed UTXOs found on the network.');
        }
        return utxos;
    }

    async createSignedTransactionHex(utxos: any[], amountToSendSats: number, toAddress: string, myAddress: string, keyPair: any) {
        const psbt = new bitcoin.Psbt({ network: LITECOIN_NETWORK });
        let totalAvailableSats = 0;
        let dynamicFeeSats = 2000;
        const feeRatePerByte = 10;
        const baseOutputBytes = (2 * 34) + 10;
        let inputsUsedCount = 0;

        for (const utxo of utxos) {
            let hex = '';
            try {
                const rawTxResponse = await axios.get(`${BLOCKCYPHER_BASE_URL}/txs/${utxo.tx_hash}?includeHex=true`);
                hex = rawTxResponse.data.hex;
            } catch (error) {
                console.warn(`[FALLBACK] Fetching hex for ${utxo.tx_hash} from Litecoinspace`);
                const lsResponse = await axios.get(`https://litecoinspace.org/api/tx/${utxo.tx_hash}/hex`);
                hex = lsResponse.data;
            }

            psbt.addInput({
                hash: utxo.tx_hash,
                index: utxo.tx_output_n,
                nonWitnessUtxo: Buffer.from(hex, 'hex'),
            });

            inputsUsedCount++;
            dynamicFeeSats = (baseOutputBytes + (inputsUsedCount * 148)) * feeRatePerByte;
            totalAvailableSats += utxo.value;

            if (totalAvailableSats >= amountToSendSats + dynamicFeeSats) break;
        }

        if (totalAvailableSats < amountToSendSats + dynamicFeeSats) {
            throw new Error(`Insufficient LTC. Available: ${CurrencyUtils.satsToLtc(totalAvailableSats).toFixed(8)} | Required: ${CurrencyUtils.satsToLtc(amountToSendSats + dynamicFeeSats).toFixed(8)}`);
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


    async broadcastRawTransaction(rawTransactionHex: string) {
        try {
            const pushResponse = await axios.post(`${BLOCKCYPHER_BASE_URL}/txs/push`, {
                tx: rawTransactionHex
            });
            return { tx: { hash: pushResponse.data.tx.hash } };
        } catch (error) {
            console.warn('[FALLBACK] Blockcypher push failed, broadcasting via Litecoinspace');
            const lsRes = await axios.post(`https://litecoinspace.org/api/tx`, rawTransactionHex, {
                headers: { 'Content-Type': 'text/plain' }
            });
            return { tx: { hash: lsRes.data } };
        }
    }
}
