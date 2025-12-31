import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorReporting } from '@google-cloud/error-reporting';
import { CloudLoggerService } from '../services/cloud-logger.service';

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private errorReporting: ErrorReporting | null = null;

    constructor(private readonly logger: CloudLoggerService) {
        // 只在生產環境初始化 Error Reporting
        if (process.env.NODE_ENV === 'production') {
            this.errorReporting = new ErrorReporting({
                projectId: process.env.GCP_PROJECT_ID || 'light-keepers-mvp',
                reportMode: 'always',
            });
        }
    }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status: number;
        let message: string;
        let stack: string | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            message = typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse as { message: string }).message || exception.message;
            stack = exception.stack;
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = exception.message;
            stack = exception.stack;
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
        }

        // 記錄錯誤
        this.logger.logError(exception instanceof Error ? exception : new Error(String(exception)), {
            path: request.url,
            method: request.method,
            statusCode: status,
            userId: (request as { user?: { id?: string } }).user?.id,
        });

        // 回報到 Cloud Error Reporting (僅生產環境 + 5xx 錯誤)
        if (this.errorReporting && status >= 500 && exception instanceof Error) {
            this.errorReporting.report(exception);
        }

        // 回傳 JSON 錯誤回應
        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: status >= 500 && process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : message,
        });
    }
}
