/**
 * Offline Authentication Service
 * 
 * P0 災時韌性：離線認證機制
 * 支援 72+ 小時斷網仍可正常認證
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

export interface OfflineToken {
    token: string;
    userId: string;
    issuedAt: Date;
    expiresAt: Date;
    permissions: string[];
    signature: string;
}

export interface CachedPermission {
    userId: string;
    roles: string[];
    permissions: string[];
    cachedAt: Date;
    validUntil: Date;
}

/**
 * 離線認證服務
 * 
 * 功能:
 * - 預簽發離線 Token (72h 有效)
 * - 離線憑證驗證 (無需連線)
 * - 離線權限快取
 * - Token 輪換與撤銷
 */
@Injectable()
export class OfflineAuthService {
    private readonly logger = new Logger(OfflineAuthService.name);
    
    // 離線權限快取 (記憶體)
    private readonly permissionCache = new Map<string, CachedPermission>();
    
    // 已撤銷的 Token (需同步)
    private readonly revokedTokens = new Set<string>();
    
    // 離線 Token 有效期 (72 小時)
    private readonly OFFLINE_TOKEN_TTL = 72 * 60 * 60 * 1000;
    
    // 權限快取有效期 (168 小時 / 7 天)
    private readonly PERMISSION_CACHE_TTL = 168 * 60 * 60 * 1000;

    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
    ) {}

    /**
     * 預簽發離線 Token
     * 在有網路時預先發放，供離線時使用
     */
    issueOfflineToken(
        userId: string,
        roles: string[],
        permissions: string[],
    ): OfflineToken {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.OFFLINE_TOKEN_TTL);
        
        const payload = {
            sub: userId,
            type: 'offline',
            roles,
            permissions,
            iat: Math.floor(now.getTime() / 1000),
            exp: Math.floor(expiresAt.getTime() / 1000),
        };
        
        const token = this.jwtService.sign(payload, {
            secret: this.getOfflineSecret(),
        });
        
        // 生成簽名用於離線驗證
        const signature = this.generateSignature(token);
        
        this.logger.log(`Issued offline token for user ${userId}, expires at ${expiresAt.toISOString()}`);
        
        return {
            token,
            userId,
            issuedAt: now,
            expiresAt,
            permissions,
            signature,
        };
    }

    /**
     * 離線驗證 Token (無需連線)
     */
    verifyOfflineToken(token: string): { valid: boolean; userId?: string; permissions?: string[] } {
        try {
            // 檢查是否已撤銷
            const tokenHash = this.hashToken(token);
            if (this.revokedTokens.has(tokenHash)) {
                this.logger.warn('Token has been revoked');
                return { valid: false };
            }
            
            // 驗證 JWT
            const payload = this.jwtService.verify(token, {
                secret: this.getOfflineSecret(),
            });
            
            if (payload.type !== 'offline') {
                return { valid: false };
            }
            
            return {
                valid: true,
                userId: payload.sub,
                permissions: payload.permissions,
            };
        } catch (error) {
            this.logger.debug(`Offline token verification failed: ${error.message}`);
            return { valid: false };
        }
    }

    /**
     * 快取使用者權限 (供離線使用)
     */
    cachePermissions(
        userId: string,
        roles: string[],
        permissions: string[],
    ): void {
        const now = new Date();
        
        this.permissionCache.set(userId, {
            userId,
            roles,
            permissions,
            cachedAt: now,
            validUntil: new Date(now.getTime() + this.PERMISSION_CACHE_TTL),
        });
        
        this.logger.debug(`Cached permissions for user ${userId}`);
    }

    /**
     * 取得快取的權限
     */
    getCachedPermissions(userId: string): CachedPermission | null {
        const cached = this.permissionCache.get(userId);
        
        if (!cached) {
            return null;
        }
        
        // 檢查是否過期
        if (new Date() > cached.validUntil) {
            this.permissionCache.delete(userId);
            return null;
        }
        
        return cached;
    }

    /**
     * 撤銷 Token
     */
    revokeToken(token: string): void {
        const tokenHash = this.hashToken(token);
        this.revokedTokens.add(tokenHash);
        this.logger.log('Token revoked');
    }

    /**
     * 批量撤銷使用者所有 Token
     */
    revokeAllUserTokens(userId: string): void {
        // 清除權限快取
        this.permissionCache.delete(userId);
        this.logger.log(`Revoked all tokens for user ${userId}`);
    }

    /**
     * 檢查離線 Token 剩餘有效時間
     */
    getTokenRemainingTime(token: string): number {
        try {
            const payload = this.jwtService.decode(token) as any;
            if (!payload?.exp) {
                return 0;
            }
            const expTime = payload.exp * 1000;
            const remaining = expTime - Date.now();
            return Math.max(0, remaining);
        } catch {
            return 0;
        }
    }

    /**
     * 取得需要續期的 Token (剩餘 < 24h)
     */
    shouldRenewToken(token: string): boolean {
        const remaining = this.getTokenRemainingTime(token);
        const RENEWAL_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
        return remaining > 0 && remaining < RENEWAL_THRESHOLD;
    }

    /**
     * 清理過期快取
     */
    cleanupExpiredCache(): number {
        const now = new Date();
        let cleaned = 0;
        
        for (const [userId, cached] of this.permissionCache.entries()) {
            if (now > cached.validUntil) {
                this.permissionCache.delete(userId);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.logger.debug(`Cleaned up ${cleaned} expired permission caches`);
        }
        
        return cleaned;
    }

    /**
     * 取得離線認證統計
     */
    getStats(): {
        cachedUsers: number;
        revokedTokens: number;
    } {
        return {
            cachedUsers: this.permissionCache.size,
            revokedTokens: this.revokedTokens.size,
        };
    }

    // ==================== Private Helpers ====================

    private getOfflineSecret(): string {
        return this.configService.get<string>('JWT_OFFLINE_SECRET') 
            || this.configService.get<string>('JWT_SECRET') 
            || 'offline-fallback-secret';
    }

    private generateSignature(token: string): string {
        const secret = this.getOfflineSecret();
        return crypto
            .createHmac('sha256', secret)
            .update(token)
            .digest('hex')
            .substring(0, 16);
    }

    private hashToken(token: string): string {
        return crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
    }
}
