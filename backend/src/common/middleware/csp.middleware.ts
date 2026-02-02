/**
 * CSP (Content Security Policy) Middleware
 * 
 * Implements Content Security Policy headers to prevent XSS and data injection.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CSPMiddleware implements NestMiddleware {
    private readonly cspDirectives = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'connect-src': [
            "'self'",
            'https://api.lightkeepers.app',
            'wss://api.lightkeepers.app',
            'https://firebaseapp.com',
            'https://identitytoolkit.googleapis.com',
        ],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"],
        'object-src': ["'none'"],
    };

    use(req: Request, res: Response, next: NextFunction) {
        const cspHeader = Object.entries(this.cspDirectives)
            .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
            .join('; ');

        res.setHeader('Content-Security-Policy', cspHeader);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');

        next();
    }
}

/**
 * CSP Report Handler
 * Logs CSP violations for monitoring
 */
@Injectable()
export class CSPReportHandler {
    handleReport(report: any) {
        console.warn('[CSP Violation]', JSON.stringify({
            documentUri: report['document-uri'],
            violatedDirective: report['violated-directive'],
            blockedUri: report['blocked-uri'],
            sourceFile: report['source-file'],
            lineNumber: report['line-number'],
        }));
    }
}
