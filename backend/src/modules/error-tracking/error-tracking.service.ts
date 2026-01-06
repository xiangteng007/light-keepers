/**
 * Sentry Error Tracking Service
 * Integrates Sentry for error monitoring and performance tracking
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SentryContext {
    user?: { id: string; email?: string; name?: string };
    tags?: Record<string, string>;
    extra?: Record<string, any>;
}

@Injectable()
export class ErrorTrackingService implements OnModuleInit {
    private readonly logger = new Logger(ErrorTrackingService.name);
    private sentry: any = null;
    private isEnabled = false;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        const dsn = this.configService.get<string>('SENTRY_DSN');
        const environment = this.configService.get<string>('NODE_ENV') || 'development';

        if (!dsn) {
            this.logger.log('Sentry DSN not configured, error tracking disabled');
            return;
        }

        try {
            // Dynamic import for Sentry (optional dependency)
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const Sentry = await import('@sentry/node' as any);

            Sentry.init({
                dsn,
                environment,
                release: this.configService.get<string>('APP_VERSION') || '1.0.0',
                tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
                integrations: [],
                beforeSend(event: any) {
                    // Filter out sensitive data
                    if (event.request?.headers) {
                        delete event.request.headers.authorization;
                        delete event.request.headers.cookie;
                    }
                    return event;
                },
            });

            this.sentry = Sentry;
            this.isEnabled = true;
            this.logger.log('Sentry initialized successfully');
        } catch (error) {
            this.logger.warn('Sentry unavailable', error);
        }
    }

    /**
     * Capture an exception
     */
    captureException(error: Error, context?: SentryContext): string | null {
        if (!this.isEnabled || !this.sentry) {
            this.logger.error('Exception (untracked):', error);
            return null;
        }

        return this.sentry.withScope((scope: any) => {
            if (context?.user) {
                scope.setUser(context.user);
            }
            if (context?.tags) {
                Object.entries(context.tags).forEach(([key, value]) => {
                    scope.setTag(key, value);
                });
            }
            if (context?.extra) {
                Object.entries(context.extra).forEach(([key, value]) => {
                    scope.setExtra(key, value);
                });
            }
            return this.sentry.captureException(error);
        });
    }

    /**
     * Capture a message
     */
    captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: SentryContext): string | null {
        if (!this.isEnabled || !this.sentry) {
            this.logger.log(`Message (untracked): ${message}`);
            return null;
        }

        return this.sentry.withScope((scope: any) => {
            scope.setLevel(level);
            if (context?.user) scope.setUser(context.user);
            if (context?.tags) {
                Object.entries(context.tags).forEach(([k, v]) => scope.setTag(k, v));
            }
            return this.sentry.captureMessage(message);
        });
    }

    /**
     * Add breadcrumb for debugging
     */
    addBreadcrumb(breadcrumb: {
        category?: string;
        message: string;
        level?: 'debug' | 'info' | 'warning' | 'error';
        data?: Record<string, any>;
    }): void {
        if (!this.isEnabled || !this.sentry) return;
        this.sentry.addBreadcrumb(breadcrumb);
    }

    /**
     * Set user context
     */
    setUser(user: { id: string; email?: string; name?: string } | null): void {
        if (!this.isEnabled || !this.sentry) return;
        this.sentry.setUser(user);
    }

    /**
     * Set tag
     */
    setTag(key: string, value: string): void {
        if (!this.isEnabled || !this.sentry) return;
        this.sentry.setTag(key, value);
    }

    /**
     * Start a transaction for performance monitoring
     */
    startTransaction(name: string, op: string): any {
        if (!this.isEnabled || !this.sentry) return null;
        return this.sentry.startSpan({ name, op });
    }

    /**
     * Flush all pending events
     */
    async flush(timeout: number = 2000): Promise<boolean> {
        if (!this.isEnabled || !this.sentry) return true;
        return this.sentry.flush(timeout);
    }

    /**
     * Check if enabled
     */
    get enabled(): boolean {
        return this.isEnabled;
    }
}
