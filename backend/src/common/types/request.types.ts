/**
 * Shared Request Type Definitions
 * Centralized request interfaces to eliminate duplicate definitions
 * across controllers and guards.
 */
import { Request } from 'express';

/**
 * JWT payload structure after verification
 */
export interface JwtPayload {
    sub: string;
    email?: string;
    name?: string;
    role?: string;
    level?: number;
    iat?: number;
    exp?: number;
}

/**
 * User object attached to request by JWT guard
 */
export interface RequestUser {
    id: string;
    userId?: string;
    email?: string;
    name?: string;
    role?: string;
    level?: number;
    roles?: Array<{ level: number; name: string }>;
    // Legacy aliases (used by some controllers)
    uid?: string;
    roleLevel?: number;
    displayName?: string;
    sub?: string;
}

/**
 * Standard authenticated request with user property
 * Use this for all controllers that require authentication
 */
export interface AuthenticatedRequest extends Request {
    user: RequestUser;
}

/**
 * Request with optional cookies (for refresh token handling)
 */
export interface RequestWithCookies extends Request {
    cookies?: {
        refresh_token?: string;
        [key: string]: string | undefined;
    };
    headers: Request['headers'] & {
        'user-agent'?: string;
    };
    ip?: string;
}

/**
 * Request with both user and cookies
 */
export interface AuthenticatedRequestWithCookies extends AuthenticatedRequest {
    cookies?: {
        refresh_token?: string;
        [key: string]: string | undefined;
    };
}

/**
 * Type guard to check if request has user
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
    return 'user' in req && req.user != null;
}
