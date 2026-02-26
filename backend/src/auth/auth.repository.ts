import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthRepository {
    constructor(private readonly supabaseService: SupabaseService) { }

    async verifyUserPassword(email: string, password: string) {
        const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) {
            return { verified: false, error: error?.message || 'Invalid password' };
        }

        return { verified: true, user: data.user };
    }
}
