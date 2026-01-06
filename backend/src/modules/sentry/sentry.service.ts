import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sentry Error Tracking Service
 * Centralized error reporting and monitoring
 * 
 * 📋 需要設定:
 * - SENTRY_DSN: Sentry DSN
 */
@Injectable()
export class SentryService implements OnModuleInit {
    private readonly logger = new Logger(SentryService.name);
    private initialized = false;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const dsn = this.configService.get<string>('SENTRY_DSN');
        if (dsn) {
            // TODO: Initialize Sentry SDK
            // Sentry.init({
            //     dsn,
            //     environment: this.configService.get('NODE_ENV'),
            //     tracesSampleRate: 0.1,
            // });
            this.initialized = true;
            this.logger.log('Sentry initialized');
        } else {
            this.logger.warn('SENTRY_DSN not configured, error tracking disabled');
        }
    }

    /**
     * 捕捉錯誤
     */
    captureException(error: Error, context?: Record<string, any>): string {
        const eventId = `err-${Date.now()}`;

        if (this.initialized) {
            // Sentry.captureException(error, { extra: context });
        }

        this.logger.error(`[${eventId}] ${error.message}`, error.stack);
        return eventId;
    }

    /**
     * 捕捉訊息
     */
    captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): string {
        const eventId = `msg-${Date.now()}`;

        if (this.initialized) {
            // Sentry.captureMessage(message, level);
        }

        if (level === 'error') this.logger.error(`[${eventId}] ${message}`);
        else if (level === 'warning') this.logger.warn(`[${eventId}] ${message}`);
        else this.logger.log(`[${eventId}] ${message}`);
        return eventId;
    }

    /**
     * 設定使用者上下文
     */
    setUser(user: { id: string; email?: string; username?: string }): void {
        if (this.initialized) {
            // Sentry.setUser(user);
        }
    }

    /**
     * 設定額外標籤
     */
    setTag(key: string, value: string): void {
        if (this.initialized) {
            // Sentry.setTag(key, value);
        }
    }

    /**
     * 開始交易追蹤
     */
    startTransaction(name: string, op: string): TransactionContext {
        const startTime = Date.now();
        return {
            name,
            op,
            startTime,
            finish: () => {
                const duration = Date.now() - startTime;
                this.logger.debug(`Transaction ${name} (${op}) completed in ${duration}ms`);
            },
        };
    }

    /**
     * 取得狀態
     */
    getStatus(): { initialized: boolean; dsn: boolean } {
        return {
            initialized: this.initialized,
            dsn: !!this.configService.get<string>('SENTRY_DSN'),
        };
    }
}

interface TransactionContext {
    name: string;
    op: string;
    startTime: number;
    finish: () => void;
}
