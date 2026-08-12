import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';

@Injectable()
export class SupabasePingService implements OnModuleInit {
  private readonly logger = new Logger('SupabaseKeepAlive');

  constructor(private readonly supabaseService: SupabaseService) {}

  async onModuleInit() {
    this.logger.log('Initializing Supabase keep-alive service...');
    await this.pingSupabase();
  }

  // Runs twice a day (every 12 hours) to ensure Supabase stays active
  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCronPing() {
    this.logger.log('Executing scheduled 12-hour Supabase keep-alive ping...');
    await this.pingSupabase();
  }

  private async pingSupabase() {
    try {
      const { error } = await this.supabaseService.databaseClient
        .from('wallets')
        .select('id')
        .limit(1);

      if (error) {
        this.logger.warn(`Supabase keep-alive ping warning: ${error.message}`);
      } else {
        this.logger.log('🟢 Supabase keep-alive ping successful (Database is active)');
      }
    } catch (err: any) {
      this.logger.error(`Supabase keep-alive ping failed: ${err?.message || err}`, err?.stack);
    }
  }
}
