import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
    public databaseClient: SupabaseClient;

    constructor(private readonly applicationConfiguration: ConfigService) { }

    onModuleInit() {
        const supabaseProjectUrl = this.applicationConfiguration.get<string>('SUPABASE_URL');
        const supabaseApiKey = this.applicationConfiguration.get<string>('SUPABASE_KEY');

        if (!supabaseProjectUrl || !supabaseApiKey) {
            throw new Error('Supabase configuration missing');
        }

        this.databaseClient = createClient(supabaseProjectUrl, supabaseApiKey);
    }

    getClient(jwtToken?: string): SupabaseClient {
        const supabaseProjectUrl = this.applicationConfiguration.get<string>('SUPABASE_URL');
        const supabaseApiKey = this.applicationConfiguration.get<string>('SUPABASE_KEY');

        if (!jwtToken) return this.databaseClient;

        return createClient(supabaseProjectUrl!, supabaseApiKey!, {
            global: {
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                },
            },
        });
    }
}
