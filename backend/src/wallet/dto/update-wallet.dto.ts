import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateWalletDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}
