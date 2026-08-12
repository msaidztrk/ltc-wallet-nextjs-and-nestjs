import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';
import { SupabasePingService } from './supabase-ping.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [SupabaseService, SupabasePingService],
  exports: [SupabaseService],
})
export class SupabaseModule { }

