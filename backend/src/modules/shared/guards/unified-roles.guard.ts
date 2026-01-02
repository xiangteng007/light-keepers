import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from './core-jwt.guard';

/**
 * 角色等級常數
 * 與 Role entity 的 level 欄位對應
 */
export const ROLE_LEVELS = {
    PUBLIC: 0,      // 一般民眾（公開存取）
    VOLUNTEER: 1,   // 登記志工
    OFFICER: 2,     // 幹部
    DIRECTOR: 3,    // 常務理事
    CHAIRMAN: 4,    // 理事長
    OWNER: 5,       // 系統擁有者
} as const;

export type RoleLevelType = typeof ROLE_LEVELS[keyof typeof ROLE_LEVELS];

// Metadata keys
const REQUIRED_LEVEL_KEY = 'requiredLevel';
const REQUIRED_ROLES_KEY = 'requiredRoles';

/**
 * RequiredLevel Decorator
 * 標記端點需要的最低權限等級
 * 
 * @param level 最低權限等級
 * @example
 * @RequiredLevel(ROLE_LEVELS.OFFICER)
 * @Get('officers-only')
 * officersOnly() { }
 */
export const RequiredLevel = (level: RoleLevelType) => SetMetadata(REQUIRED_LEVEL_KEY, level);

/**
 * RequiredRoles Decorator
 * 標記端點需要的角色名稱（任一符合即可）
 * 
 * @param roles 允許的角色名稱
 * @example
 * @RequiredRoles('owner', 'chairman')
 * @Get('leadership-only')
 * leadershipOnly() { }
 */
export const RequiredRoles = (...roles: string[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);

/**
 * UnifiedRolesGuard - 統一的角色權限 Guard
 * 
 * 設計原則：
 * 1. 不依賴任何 Repository，避免循環依賴
 * 2. 從 JWT payload 讀取 roleLevel 和 roles
 * 3. 支援等級檢查 (RequiredLevel) 和角色檢查 (RequiredRoles)
 * 
 * 使用方式：
 * 必須搭配 CoreJwtGuard 使用，順序為 CoreJwtGuard -> UnifiedRolesGuard
 * 
 * @example
 * @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
 * @RequiredLevel(ROLE_LEVELS.OFFICER)
 * @Get('admin')
 * adminEndpoint(@CurrentUser() user: JwtPayload) { }
 */
@Injectable()
export class UnifiedRolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 取得 decorator 設定
        const requiredLevel = this.reflector.getAllAndOverride<RoleLevelType>(
            REQUIRED_LEVEL_KEY,
            [context.getHandler(), context.getClass()],
        );

        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            REQUIRED_ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // 沒有設定權限需求，允許存取
        if (requiredLevel === undefined && (!requiredRoles || requiredRoles.length === 0)) {
            return true;
        }

        // Level 0 = 公開端點，允許匿名存取（不需要檢查 user）
        if (requiredLevel === 0 && (!requiredRoles || requiredRoles.length === 0)) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // 需要 Level 1+ 但沒有 user 資訊
        if (!user && requiredLevel !== undefined && requiredLevel > 0) {
            throw new ForbiddenException('需要登入才能存取此資源');
        }

        // 匿名用戶嘗試存取需要登入的資源 (Level 1+)
        if (user?.isAnonymous && requiredLevel !== undefined && requiredLevel > 0) {
            throw new ForbiddenException('需要登入才能存取此資源');
        }

        const userLevel = user?.roleLevel ?? 0;
        const userRoles = user?.roles ?? [];

        // 檢查等級
        if (requiredLevel !== undefined && userLevel < requiredLevel) {
            throw new ForbiddenException(
                `權限不足，需要等級 ${requiredLevel} (${this.getLevelName(requiredLevel)}) 以上`,
            );
        }

        // 檢查角色（任一符合即可）
        if (requiredRoles && requiredRoles.length > 0) {
            const hasRole = requiredRoles.some(role => userRoles.includes(role));
            if (!hasRole) {
                throw new ForbiddenException(
                    `權限不足，需要以下角色之一：${requiredRoles.join(', ')}`,
                );
            }
        }

        return true;
    }

    private getLevelName(level: number): string {
        const names: Record<number, string> = {
            0: '一般民眾',
            1: '志工',
            2: '幹部',
            3: '常務理事',
            4: '理事長',
            5: '系統擁有者',
        };
        return names[level] || `Level ${level}`;
    }
}
