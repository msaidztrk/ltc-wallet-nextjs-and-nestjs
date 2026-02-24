export interface Wallet {
    id: string;
    name: string;
    public_address: string;
    created_at: string;
    liveBalance?: string;
}

export interface TxRef {
    tx_hash: string;
    value: number;
    confirmed?: string;
    tx_input_n: number;
    tx_output_n: number;
}
