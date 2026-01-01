/**
 * Refresh Token Service
 * 
 * Handles secure refresh token generation, validation, and revocation.
 * Tokens are stored as SHA-256 hashes in the database.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';

// Refresh token configuration
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const REFRESH_TOKEN_BYTES = 32; // 256 bits

@Injectable()
export class RefreshTokenService {
    constructor(
        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,
    ) { }

    /**
     * Generate a new refresh token for an account
     * Returns the raw token (to be sent to client as httpOnly cookie)
     */
    async createRefreshToken(
        accountId: string,
        userAgent?: string,
        ipAddress?: string,
    ): Promise<string> {
        // Generate cryptographically secure random token
        const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

        // Hash the token for storage
        const tokenHash = this.hashToken(rawToken);

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

        // Create refresh token record
        const refreshToken = this.refreshTokenRepository.create({
            tokenHash,
            accountId,
            userAgent: userAgent?.substring(0, 500), // Limit length
            ipAddress,
            expiresAt,
        });

        await this.refreshTokenRepository.save(refreshToken);

        return rawToken;
    }

    /**
     * Validate a refresh token and return the associated account ID
     * Also updates lastUsedAt timestamp
     */
    async validateRefreshToken(rawToken: string): Promise<string | null> {
        if (!rawToken) return null;

        const tokenHash = this.hashToken(rawToken);

        const refreshToken = await this.refreshTokenRepository.findOne({
            where: { tokenHash },
        });

        if (!refreshToken) return null;

        // Check if revoked
        if (refreshToken.isRevoked) {
            console.warn(`[RefreshToken] Attempted use of revoked token for account ${refreshToken.accountId}`);
            return null;
        }

        // Check if expired
        if (new Date() > refreshToken.expiresAt) {
            console.warn(`[RefreshToken] Expired token used for account ${refreshToken.accountId}`);
            return null;
        }

        // Update last used
        refreshToken.lastUsedAt = new Date();
        await this.refreshTokenRepository.save(refreshToken);

        return refreshToken.accountId;
    }

    /**
     * Revoke a specific refresh token (logout)
     */
    async revokeToken(rawToken: string): Promise<boolean> {
        if (!rawToken) return false;

        const tokenHash = this.hashToken(rawToken);

        const result = await this.refreshTokenRepository.update(
            { tokenHash },
            { isRevoked: true },
        );

        return (result.affected ?? 0) > 0;
    }

    /**
     * Revoke all refresh tokens for an account (security measure)
     */
    async revokeAllTokens(accountId: string): Promise<number> {
        const result = await this.refreshTokenRepository.update(
            { accountId, isRevoked: false },
            { isRevoked: true },
        );

        return result.affected ?? 0;
    }

    /**
     * Get active tokens for an account (for session management UI)
     */
    async getActiveSessions(accountId: string): Promise<Array<{
        id: string;
        userAgent: string;
        ipAddress: string;
        createdAt: Date;
        lastUsedAt: Date;
    }>> {
        const tokens = await this.refreshTokenRepository.find({
            where: {
                accountId,
                isRevoked: false,
                expiresAt: LessThan(new Date()),
            },
            order: { lastUsedAt: 'DESC' },
            take: 10,
        });

        return tokens.map(t => ({
            id: t.id,
            userAgent: t.userAgent,
            ipAddress: t.ipAddress,
            createdAt: t.createdAt,
            lastUsedAt: t.lastUsedAt,
        }));
    }

    /**
     * Revoke a specific session by ID
     */
    async revokeSession(accountId: string, sessionId: string): Promise<boolean> {
        const result = await this.refreshTokenRepository.update(
            { id: sessionId, accountId },
            { isRevoked: true },
        );

        return (result.affected ?? 0) > 0;
    }

    /**
     * Cleanup expired tokens (should be called periodically)
     */
    async cleanupExpiredTokens(): Promise<number> {
        const result = await this.refreshTokenRepository.delete({
            expiresAt: LessThan(new Date()),
        });

        return result.affected ?? 0;
    }

    /**
     * Hash a token using SHA-256
     */
    private hashToken(rawToken: string): string {
        return crypto.createHash('sha256').update(rawToken).digest('hex');
    }
}
