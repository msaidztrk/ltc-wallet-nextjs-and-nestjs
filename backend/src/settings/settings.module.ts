import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsRepository } from './settings.repository';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    controllers: [SettingsController],
    providers: [SettingsRepository],
    exports: [SettingsRepository],
})
export class SettingsModule { }
