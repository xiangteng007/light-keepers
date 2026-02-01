import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

/**
 * Sentry Error Tracking Service
 * Centralized error reporting and monitoring
 * 
 * 📋 環境變數:
 * - SENTRY_DSN: Sentry DSN (必填，無則停用)
 * - NODE_ENV: 環境名稱 (production/staging/development)
 */
@Injectable()
export class SentryService implements OnModuleInit {
    private readonly logger = new Logger(SentryService.name);
    private initialized = false;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const dsn = this.configService.get<string>('SENTRY_DSN');
        const environment = this.configService.get<string>('NODE_ENV') || 'development';

        if (dsn) {
            try {
                Sentry.init({
                    dsn,
                    environment,
                    release: process.env.npm_package_version || '1.0.0',
                    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
                    ignoreErrors: [
                        'UnauthorizedException',
                        'ForbiddenException',
                        'NotFoundException',
                    ],
                });

                this.initialized = true;
                this.logger.log(`✅ Sentry initialized (env: ${environment})`);
            } catch (error) {
                this.logger.error('Failed to initialize Sentry', error);
            }
        } else {
            this.logger.warn('⚠️ SENTRY_DSN not configured, error tracking disabled');
        }
    }

    /**
     * 捕捉錯誤
     */
    captureException(error: Error, context?: Record<string, any>): string {
        const eventId = this.initialized
            ? Sentry.captureException(error, { extra: context })
            : `local-${Date.now()}`;

        this.logger.error(`[${eventId}] ${error.message}`, error.stack);
        return eventId;
    }

    /**
     * 捕捉訊息
     */
    captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): string {
        const sentryLevel = level === 'warning' ? 'warning' : level;
        const eventId = this.initialized
            ? Sentry.captureMessage(message, sentryLevel)
            : `local-${Date.now()}`;

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
            Sentry.setUser(user);
        }
    }

    /**
     * 清除使用者上下文
     */
    clearUser(): void {
        if (this.initialized) {
            Sentry.setUser(null);
        }
    }

    /**
     * 設定額外標籤
     */
    setTag(key: string, value: string): void {
        if (this.initialized) {
            Sentry.setTag(key, value);
        }
    }

    /**
     * 設定額外上下文
     */
    setContext(name: string, context: Record<string, any>): void {
        if (this.initialized) {
            Sentry.setContext(name, context);
        }
    }

    /**
     * 添加麵包屑 (追蹤事件路徑)
     */
    addBreadcrumb(message: string, category?: string, level?: 'debug' | 'info' | 'warning' | 'error'): void {
        if (this.initialized) {
            Sentry.addBreadcrumb({
                category: category || 'app',
                message,
                level: level || 'info',
                timestamp: Date.now() / 1000,
            });
        }
    }

    /**
     * 強制刷新 (在程式結束前調用)
     */
    async flush(timeout: number = 2000): Promise<boolean> {
        if (this.initialized) {
            return Sentry.flush(timeout);
        }
        return true;
    }

    /**
     * 取得狀態
     */
    getStatus(): { initialized: boolean; dsn: boolean; environment: string } {
        return {
            initialized: this.initialized,
            dsn: !!this.configService.get<string>('SENTRY_DSN'),
            environment: this.configService.get<string>('NODE_ENV') || 'development',
        };
    }

    /**
     * 手動測試 Sentry 連線
     */
    testConnection(): string {
        if (!this.initialized) {
            return 'Sentry not initialized - no DSN configured';
        }

        const testError = new Error('Sentry Test Connection - This is a test error');
        const eventId = Sentry.captureException(testError);
        this.logger.log(`🧪 Test error sent to Sentry: ${eventId}`);
        return eventId;
    }
}
