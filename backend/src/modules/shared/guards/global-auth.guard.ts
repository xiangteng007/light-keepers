import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { WsException } from '@nestjs/websockets';
import { IS_PUBLIC_KEY } from './public.decorator';

// Import REQUIRED_LEVEL_KEY for @RequiredLevel(0) as public
const REQUIRED_LEVEL_KEY = 'requiredLevel';

type AuthPayload = Record<string, unknown>;

type AuthContext = {
    tokenType: 'jwt';
    subject?: string;
    issuedAt?: number;
    expiresAt?: number;
    raw?: AuthPayload;
};

type AuthedRequest = Request & {
    user?: AuthPayload;
    auth?: AuthContext;
};

/**
 * GlobalAuthGuard (APP_GUARD)
 *
 * Hard rules:
 * 1) Default deny: all endpoints require auth unless explicitly marked @Public()
 * 2) @Public() bypasses auth, but does not imply "no throttling" (throttling handled elsewhere)
 * 3) Missing/invalid token MUST return 401 for HTTP (throw UnauthorizedException)
 * 4) For WS/Socket.IO, missing/invalid token MUST throw WsException (fails handshake / event)
 *
 * Supported token sources (in order):
 * - HTTP: Authorization: Bearer <token>
 * - HTTP: Cookie: access_token=<token> / __session=<token> (fallback)
 * - WS: handshake.headers.authorization (Bearer)
 * - WS: handshake.auth.token (raw token)
 *
 * Policy Rule (SSOT: docs/policy/public-surface.policy.json):
 * - @Public() OR @RequiredLevel(0) = endpoint is public (anonymous allowed)
 *
 * @see docs/policy/public-surface.policy.json
 * @see docs/proof/security/T9-app-guard-registration-report.json
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
    private readonly logger = new Logger(GlobalAuthGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly jwtService: JwtService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check @Public() decorator
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) return true;

        // Check @RequiredLevel(0) - also treated as public per policy
        const requiredLevel = this.reflector.getAllAndOverride<number>(REQUIRED_LEVEL_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (requiredLevel === 0) return true;

        const type = context.getType<'http' | 'ws' | 'rpc'>();

        if (type === 'http') return this.handleHttp(context);
        if (type === 'ws') return this.handleWs(context);

        // Default conservative: deny unknown execution types
        throw new UnauthorizedException('Unsupported execution context');
    }

    private async handleHttp(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthedRequest>();
        const token = this.extractTokenHttp(request);

        if (!token) {
            throw new UnauthorizedException('Missing access token (bearer or cookie)');
        }

        const payload = await this.verifyTokenOrThrow(token, 'http');
        request.user = payload;
        request.auth = this.toAuthContext(payload);

        return true;
    }

    private async handleWs(context: ExecutionContext): Promise<boolean> {
        const client: any = context.switchToWs().getClient();
        const token = this.extractTokenWs(client);

        if (!token) {
            throw new WsException('Missing access token (bearer or handshake auth)');
        }

        const payload = await this.verifyTokenOrThrow(token, 'ws');
        // Socket.IO best practice: attach to client.data
        client.data = client.data || {};
        client.data.user = payload;
        client.data.auth = this.toAuthContext(payload);

        return true;
    }

    private extractTokenHttp(request: Request): string | null {
        // Authorization: Bearer xxx
        const authHeader = request.headers.authorization;
        if (authHeader) {
            const [type, token] = authHeader.split(' ');
            if (type === 'Bearer' && token) return token.trim();
        }

        // Cookie fallback (optional)
        const cookie = request.headers.cookie || '';
        const fromCookie = this.readCookie(cookie, 'access_token') || this.readCookie(cookie, '__session');
        if (fromCookie) return fromCookie;

        return null;
    }

    private extractTokenWs(client: any): string | null {
        // Socket.IO handshake auth token
        const authToken = client?.handshake?.auth?.token;
        if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

        // Authorization header
        const authHeader = client?.handshake?.headers?.authorization;
        if (typeof authHeader === 'string' && authHeader.trim()) {
            const [type, token] = authHeader.split(' ');
            if (type === 'Bearer' && token) return token.trim();
        }

        return null;
    }

    private readCookie(cookieHeader: string, name: string): string | null {
        // minimal cookie parser to avoid external deps
        const pattern = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`);
        const match = cookieHeader.match(pattern);
        if (!match) return null;
        try {
            return decodeURIComponent(match[1]);
        } catch {
            return match[1];
        }
    }

    private async verifyTokenOrThrow(token: string, channel: 'http' | 'ws'): Promise<AuthPayload> {
        try {
            // NOTE:
            // - You may enforce issuer/audience by env if needed:
            //   issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE
            const payload = await this.jwtService.verifyAsync<AuthPayload>(token, {
                ignoreExpiration: false,
            });

            // Minimal sanity check (optional but recommended)
            if (!payload || typeof payload !== 'object') {
                throw new Error('Invalid JWT payload');
            }

            return payload;
        } catch (err: unknown) {
            // Avoid leaking sensitive details
            const errMessage = err instanceof Error ? err.message : 'unknown error';
            this.logger.warn(`Token verification failed (${channel}): ${errMessage}`);
            if (channel === 'ws') throw new WsException('Unauthorized');
            throw new UnauthorizedException('Unauthorized');
        }
    }

    private toAuthContext(payload: AuthPayload): AuthContext {
        const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
        const iat = typeof payload.iat === 'number' ? payload.iat : undefined;
        const exp = typeof payload.exp === 'number' ? payload.exp : undefined;

        return {
            tokenType: 'jwt',
            subject: sub,
            issuedAt: iat,
            expiresAt: exp,
            raw: payload,
        };
    }
}
