import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

@Injectable()
export class CloudLoggerService implements NestLoggerService {
    private logger: winston.Logger;

    constructor() {
        const isProduction = process.env.NODE_ENV === 'production';

        const transports: winston.transport[] = [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.colorize(),
                    winston.format.printf(({ level, message, timestamp, ...meta }) => {
                        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                    })
                ),
            }),
        ];

        // 生產環境添加 Cloud Logging
        if (isProduction) {
            const loggingWinston = new LoggingWinston({
                projectId: process.env.GCP_PROJECT_ID || 'light-keepers-mvp',
                // Cloud Run 會自動取得憑證，不需要 keyFilename
            });
            transports.push(loggingWinston);
        }

        this.logger = winston.createLogger({
            level: isProduction ? 'info' : 'debug',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { service: 'light-keepers-api' },
            transports,
        });
    }

    log(message: string, context?: string) {
        this.logger.info(message, { context });
    }

    error(message: string, trace?: string, context?: string) {
        this.logger.error(message, { trace, context });
    }

    warn(message: string, context?: string) {
        this.logger.warn(message, { context });
    }

    debug(message: string, context?: string) {
        this.logger.debug(message, { context });
    }

    verbose(message: string, context?: string) {
        this.logger.verbose(message, { context });
    }

    // 結構化日誌方法
    logRequest(method: string, path: string, statusCode: number, duration: number, userId?: string) {
        this.logger.info('HTTP Request', {
            httpRequest: {
                requestMethod: method,
                requestUrl: path,
                status: statusCode,
                latency: `${duration}ms`,
            },
            userId,
        });
    }

    logError(error: Error, context?: Record<string, unknown>) {
        this.logger.error(error.message, {
            stack: error.stack,
            name: error.name,
            ...context,
        });
    }
}
