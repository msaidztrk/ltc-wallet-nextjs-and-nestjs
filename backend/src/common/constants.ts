export const BLOCKCYPHER_BASE_URL = process.env.BLOCKCYPHER_API_URL || 'https://api.blockcypher.com/v1/ltc/main';

export const LITECOIN_NETWORK = {
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
