import { Injectable, CanActivate, ExecutionContext, createParamDecorator, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * JWT Payload 介面
 * 這是 JWT token 解碼後的資料結構
 */
export interface JwtPayload {
    sub: string;          // Account ID (JWT standard)
    id: string;           // Account ID (alias, set by CoreJwtGuard)
    uid: string;          // Account ID (alias for AuthUser compat)
    email: string;        // Email
    name?: string;        // Display name
    displayName?: string; // Display name (alias for AuthUser compat)
    role?: string;         // 角色名稱 (backward compat)
    roleLevel?: number;   // 權限等級 (0-5)
    roles?: string[];     // 角色名稱陣列
    iat?: number;         // Issued at
    exp?: number;         // Expiration
}

/**
 * CoreJwtGuard - 核心 JWT 認證 Guard
 * 
 * 設計原則：
 * 1. 不依賴任何 Repository，避免循環依賴
 * 2. 只驗證 JWT token，不查資料庫
 * 3. 將 JWT payload 放入 request.user
 * 
 * 使用場景：
 * - 需要認證但不需要完整用戶資料的端點
 * - 有循環依賴問題的模組
 * - 效能敏感的端點
 *
 * 注意：如果需要 roleLevel 權限檢查，請搭配 UnifiedRolesGuard 使用
 *
 * @Public() 支援 (1.6 收斂修正)：
 * 與 GlobalAuthGuard 使用同一個 metadata key ('isPublic')。標記 @Public() 的
 * handler / class 一律放行，因此可以在 controller class 上掛 CoreJwtGuard，
 * 再於個別 handler 上以 @Public() 開放匿名存取（例如 intake 匿名通報）。
 * 放行時若仍帶有有效 token，會盡力解析並填入 request.user；解析失敗不拋錯。
 */
@Injectable()
export class CoreJwtGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        // @Public() 端點：放行，但仍盡力解析 token（若有）以便 handler 取得使用者
        const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            const publicToken = this.extractTokenFromHeader(request);
            if (publicToken) {
                try {
                    this.attachUser(request, this.jwtService.verify<JwtPayload>(publicToken));
                } catch {
                    // 公開端點不因無效 token 而失敗
                }
            }
            return true;
        }

        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const payload = this.jwtService.verify<JwtPayload>(token);

            // 將 payload 放入 request.user
            this.attachUser(request, payload);

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid token');
        }
    }

    private attachUser(request: Request, payload: JwtPayload): void {
        (request as any).user = {
            id: payload.sub,
            sub: payload.sub,
            uid: payload.sub,           // AuthUser compat
            email: payload.email,
            name: payload.name,
            displayName: payload.name,  // AuthUser compat
            role: payload.roles?.[0] || '',
            roleLevel: payload.roleLevel ?? 0,
            roles: payload.roles ?? [],
        };
    }

    private extractTokenFromHeader(request: Request): string | null {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : null;
    }
}

/**
 * CurrentUser Decorator
 * 從 request 取得當前用戶資訊
 * 
 * @example
 * @Get('me')
 * @UseGuards(CoreJwtGuard)
 * getMe(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 * 
 * @example 取得特定欄位
 * @Get('my-id')
 * @UseGuards(CoreJwtGuard)
 * getMyId(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
    (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return null;
        }

        return data ? user[data] : user;
    },
);
