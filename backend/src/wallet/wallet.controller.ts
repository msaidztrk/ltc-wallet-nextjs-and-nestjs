import { Body, Controller, Post, Get, Patch, Delete, Param, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import type { Request } from 'express';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { SendLtcDto } from './dto/send-ltc.dto';

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

    @Get('history')
    @HttpCode(HttpStatus.OK)
    async fetchTransactionHistory(@Req() incomingHttpRequest: Request) {
        const authenticatedUserId = incomingHttpRequest['authenticatedUser'].id;
        const jwtToken = incomingHttpRequest['jwtToken'];

        const history = await this.walletManagementService.getTransactionHistory(authenticatedUserId, jwtToken);

        return {
            status: 'success',
            data: history,
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

    @Post(':id/send')
    @HttpCode(HttpStatus.OK)
    async executeLtcTransaction(
        @Req() incomingHttpRequest: Request,
        @Param('id') sourceWalletId: string,
        @Body() transactionPayload: SendLtcDto,
    ) {
        const authenticatedUserId = incomingHttpRequest['authenticatedUser'].id;
        const jwtToken = incomingHttpRequest['jwtToken'];

        const transactionReceipt = await this.walletManagementService.sendLitecoinTransaction(
            authenticatedUserId,
            sourceWalletId,
            transactionPayload.toAddress.trim(),
            transactionPayload.amount,
            jwtToken
        );

        return transactionReceipt;
    }
}
