import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Request Logging Interceptor
 * 
 * 記錄所有 API 請求/回應的元資料：
 * - HTTP Method + URL
 * - 回應時間 (ms)
 * - 狀態碼
 * - 使用者 ID (不含敏感資料)
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url } = request;
        const userId = (request as { user?: { id?: string } }).user?.id || 'anonymous';
        const start = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const elapsed = Date.now() - start;
                    const response = context.switchToHttp().getResponse();
                    const statusCode = response.statusCode;
                    this.logger.log(
                        `${method} ${url} ${statusCode} ${elapsed}ms [user:${userId}]`,
                    );
                },
                error: (err) => {
                    const elapsed = Date.now() - start;
                    const statusCode = err?.status || 500;
                    this.logger.warn(
                        `${method} ${url} ${statusCode} ${elapsed}ms [user:${userId}] - ${err?.message}`,
                    );
                },
            }),
        );
    }
}
