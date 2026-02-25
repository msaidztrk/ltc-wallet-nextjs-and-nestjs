import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LogRepository } from './log.repository';
import { SupabaseModule } from '../supabase/supabase.module';

@Global()
@Module({
    imports: [SupabaseModule],
    providers: [LoggerService, LogRepository],
    exports: [LoggerService, LogRepository],
})
export class CommonModule { }
