import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(private readonly databaseManager: SupabaseService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Valid authentication credentials are required');
        }

        const jsonWebToken = authorizationHeader.split(' ')[1];

        const { data: authenticationData, error: authenticationError } =
            await this.databaseManager.databaseClient.auth.getUser(jsonWebToken);

        if (authenticationError || !authenticationData.user) {
            throw new UnauthorizedException('Invalid or expired authentication session');
        }

        req['authenticatedUser'] = authenticationData.user;

        next();
    }
}
