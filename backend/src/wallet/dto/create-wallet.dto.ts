import { IsString, IsNotEmpty } from 'class-validator';

export class CreateWalletDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}
