import { Controller, Post, Body, Req, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthRepository } from './auth.repository';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(private readonly authRepository: AuthRepository) { }

    @Post('verify-password')
    async verifyPassword(@Req() req, @Body('password') password: string) {
        // AuthMiddleware assigns the user to authenticatedUser key
        const user = req['authenticatedUser'];

        if (!user || !user.email) {
            throw new UnauthorizedException('User session not found or email missing');
        }

        const email = user.email;

        const result = await this.authRepository.verifyUserPassword(email, password);

        if (!result.verified) {
            throw new UnauthorizedException(result.error);
        }

        return { verified: true };
    }
}
