import { Injectable, CanActivate, ExecutionContext, createParamDecorator, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * JWT Payload 介面
 * 這是 JWT token 解碼後的資料結構
 */
export interface JwtPayload {
    sub: string;        // Account ID (JWT standard)
    id: string;         // Account ID (alias, set by CoreJwtGuard)
    email: string;      // Email
    name?: string;      // Display name
    roleLevel?: number; // 權限等級 (0-5)
    roles?: string[];   // 角色名稱陣列
    iat?: number;       // Issued at
    exp?: number;       // Expiration
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
 */
@Injectable()
export class CoreJwtGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const payload = this.jwtService.verify<JwtPayload>(token);

            // 將 payload 放入 request.user
            (request as any).user = {
                id: payload.sub,
                sub: payload.sub,
                email: payload.email,
                name: payload.name,
                roleLevel: payload.roleLevel ?? 0,
                roles: payload.roles ?? [],
            };

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid token');
        }
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
