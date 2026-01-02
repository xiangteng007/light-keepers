import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './core-jwt.guard';

/**
 * OptionalJwtGuard - 可選 JWT 認證 Guard
 * 
 * 設計原則：
 * 1. 如果有 JWT 則驗證並放入 request.user
 * 2. 如果沒有 JWT 則設定匿名用戶 request.user = { roleLevel: 0 }
 * 3. 永遠返回 true（不阻擋請求）
 * 
 * 使用場景：
 * - 公開 API 端點
 * - 同時支援匿名和登入用戶的端點
 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (token) {
            try {
                const payload = this.jwtService.verify<JwtPayload>(token);
                (request as any).user = {
                    id: payload.sub,
                    sub: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    roleLevel: payload.roleLevel ?? 1,
                    roles: payload.roles ?? [],
                    isAnonymous: false,
                };
            } catch {
                // Token 無效，視為匿名用戶
                this.setAnonymousUser(request);
            }
        } else {
            // 無 Token，視為匿名用戶
            this.setAnonymousUser(request);
        }

        return true; // 永遠允許通過
    }

    private setAnonymousUser(request: Request): void {
        (request as any).user = {
            id: null,
            sub: null,
            email: null,
            name: 'Anonymous',
            roleLevel: 0,
            roles: [],
            isAnonymous: true,
        };
    }

    private extractTokenFromHeader(request: Request): string | null {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : null;
    }
}
