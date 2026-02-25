import { IsNotEmpty, IsNumber, IsString, IsPositive, Min } from 'class-validator';

export class SendLtcDto {
    @IsString()
    @IsNotEmpty()
    toAddress: string;

    @IsNumber({ maxDecimalPlaces: 8 })
    @IsPositive()
    @Min(0.00000001)
    @IsNotEmpty()
    amount: number;
}
