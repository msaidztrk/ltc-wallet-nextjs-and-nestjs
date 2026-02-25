import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { LoggerService } from '../logger.service';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly loggerService: LoggerService) { }

    async catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const responseObj = exception instanceof HttpException ? exception.getResponse() : null;
        const message = responseObj
            ? (typeof responseObj === 'string' ? responseObj : (responseObj as any).message || 'An error occurred')
            : 'Internal server error';

        const stack = exception instanceof Error ? exception.stack : undefined;
        const errMessage = exception instanceof Error ? exception.message : String(exception);

        // Extract user and token attached by AuthMiddleware
        const userId = request['authenticatedUser']?.id || null;
        const token = request['jwtToken'] || null;
        const context = `${request.method} ${request.url}`;

        const logMessage = `Status: ${status} - Error: ${errMessage}`;

        // Log error to Supabase asynchronously
        // We use .catch to prevent unhandled promise rejections if logging fails
        this.loggerService.logError(userId, context, logMessage, stack, token).catch(e => {
            console.error('Failed to log error to DB:', e);
        });

        // Send friendly response to client
        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: message,
        });
    }
}
