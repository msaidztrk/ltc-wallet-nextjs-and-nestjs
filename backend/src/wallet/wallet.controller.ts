import { Body, Controller, Post, HttpCode, HttpStatus, UnauthorizedException, BadRequestException, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import type { Request } from 'express';

@Controller('wallets')
export class WalletController {
    constructor(private readonly walletManagementService: WalletService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createNewWallet(
        @Req() incomingHttpRequest: Request,
        @Body('name') newWalletIdentifierName: string,
    ) {

        const mockAuthenticatedUserId = '00000000-0000-0000-0000-000000000000';

        if (!newWalletIdentifierName || newWalletIdentifierName.trim().length === 0) {
            throw new BadRequestException('Wallet identifier name is required');
        }

        const generatedWalletInfo = await this.walletManagementService.createWalletRecord(
            mockAuthenticatedUserId,
            newWalletIdentifierName.trim()
        );

        return {
            status: 'success',
            data: generatedWalletInfo,
        };
    }
}
