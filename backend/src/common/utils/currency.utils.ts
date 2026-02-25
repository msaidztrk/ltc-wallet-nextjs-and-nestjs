
export class CurrencyUtils {
    private static readonly SATS_PER_LTC = 100000000;

    static ltcToSats(amount: number): number {
        return Math.floor(amount * this.SATS_PER_LTC);
    }

    static satsToLtc(sats: number): number {
        return sats / this.SATS_PER_LTC;
    }
}
