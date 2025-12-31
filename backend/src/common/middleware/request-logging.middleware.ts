import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CloudLoggerService } from '../services/cloud-logger.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
    constructor(private readonly logger: CloudLoggerService) { }

    use(req: Request, res: Response, next: NextFunction) {
        const startTime = Date.now();

        // 監聽回應完成
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const userId = (req as Request & { user?: { id?: string } }).user?.id;

            this.logger.logRequest(
                req.method,
                req.originalUrl,
                res.statusCode,
                duration,
                userId
            );
        });

        next();
    }
}
