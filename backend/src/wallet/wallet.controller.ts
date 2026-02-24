import { Body, Controller, Post, Get, Patch, Delete, Param, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import type { Request } from 'express';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Controller('wallets')
export class WalletController {
    constructor(private readonly walletManagementService: WalletService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createNewWallet(
        @Req() incomingHttpRequest: Request,
        @Body() walletPayloadData: CreateWalletDto,
    ) {
        const authenticatedUserId = incomingHttpRequest['authenticatedUser'].id;
        const jwtToken = incomingHttpRequest['jwtToken'];

        const generatedWalletInfo = await this.walletManagementService.createWalletRecord(
            authenticatedUserId,
            walletPayloadData.name.trim(),
            jwtToken
        );

        return {
            status: 'success',
            data: generatedWalletInfo,
        };
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async fetchUserWallets(@Req() incomingHttpRequest: Request) {
        const authenticatedUserId = incomingHttpRequest['authenticatedUser'].id;
        const jwtToken = incomingHttpRequest['jwtToken'];

        const fetchedWalletsList = await this.walletManagementService.retrieveWalletsForUser(authenticatedUserId, jwtToken);

        return {
            status: 'success',
            data: fetchedWalletsList,
        };
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    async renameWallet(
        @Req() incomingHttpRequest: Request,
        @Param('id') targetWalletId: string,
        @Body() walletPayloadData: UpdateWalletDto,
    ) {
        const authenticatedUserId = incomingHttpRequest['authenticatedUser'].id;
        const jwtToken = incomingHttpRequest['jwtToken'];

        const modifiedWalletData = await this.walletManagementService.modifyWalletName(
            authenticatedUserId,
            targetWalletId,
            walletPayloadData.name.trim(),
            jwtToken
        );

        return {
            status: 'success',
            data: modifiedWalletData,
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async destroyWallet(
        @Req() incomingHttpRequest: Request,
        @Param('id') targetWalletId: string,
    ) {
        const authenticatedUserId = incomingHttpRequest['authenticatedUser'].id;
        const jwtToken = incomingHttpRequest['jwtToken'];

        const outputDeletionData = await this.walletManagementService.removeWalletRecord(
            authenticatedUserId,
            targetWalletId,
            jwtToken
        );

        return {
            status: 'success',
            data: outputDeletionData,
        };
    }
}
