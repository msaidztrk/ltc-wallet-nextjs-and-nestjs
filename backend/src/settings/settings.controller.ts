import { Controller, Get, Post, Body, Req, Logger } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';

@Controller('settings')
export class SettingsController {
    private readonly logger = new Logger(SettingsController.name);
    constructor(private readonly settingsRepository: SettingsRepository) { }

    @Get()
    async getSettings(@Req() req) {
        const user = req['authenticatedUser'];
        return this.settingsRepository.getSettings(user.id);
    }

    @Post()
    async updateSettings(@Req() req, @Body() settings: any) {
        const user = req['authenticatedUser'];
        // Ensure user_id is the authenticated user's ID
        const { user_id, ...updatePayload } = settings;
        return this.settingsRepository.updateSettings(user.id, updatePayload);
    }
}
