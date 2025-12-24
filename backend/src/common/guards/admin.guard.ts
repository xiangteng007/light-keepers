import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * 角色等級定義 (對應 Role entity 的 level)
 * 0 = public (一般民眾)
 * 1 = volunteer (登記志工)
 * 2 = officer (幹部)
 * 3 = director (常務理事)
 * 4 = chairman (理事長)
 * 5 = owner (系統擁有者)
 */
export const ROLE_LEVEL = {
    PUBLIC: 0,
    VOLUNTEER: 1,
    OFFICER: 2,
    DIRECTOR: 3,
    CHAIRMAN: 4,
    OWNER: 5,
} as const;

/**
 * 角色類型 (保留向後相容)
 */
export type UserRole = 'admin' | 'coordinator' | 'volunteer' | 'viewer';

/**
 * 角色裝飾器 - 用於標記需要特定角色的端點 (向後相容)
 */
export const Roles = Reflector.createDecorator<UserRole[]>();

/**
 * 等級裝飾器 - 用於標記需要的最低等級 (新 RBAC)
 */
export const RequiredLevel = (level: number) => SetMetadata('requiredLevel', level);

/**
 * 管理員權限守衛
 * 現在使用階層式 roleLevel 檢查
 */
@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 優先使用新的 requiredLevel
        const requiredLevel = this.reflector.get<number>('requiredLevel', context.getHandler());
        const requiredRoles = this.reflector.get(Roles, context.getHandler());

        // 如果沒有指定任何權限要求，允許存取
        if (requiredLevel === undefined && (!requiredRoles || requiredRoles.length === 0)) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // 沒有使用者資訊時拒絕存取
        if (!user) {
            throw new ForbiddenException('需要登入才能存取此資源');
        }

        // 使用新的 roleLevel 檢查
        if (requiredLevel !== undefined) {
            const userLevel = user.roleLevel ?? ROLE_LEVEL.VOLUNTEER;
            if (userLevel < requiredLevel) {
                throw new ForbiddenException(`權限不足，需要等級 ${requiredLevel} 以上`);
            }
            return true;
        }

        // 向後相容：舊的 roles 檢查 (將 admin/coordinator 映射到 roleLevel)
        if (requiredRoles && requiredRoles.length > 0) {
            const userLevel = user.roleLevel ?? ROLE_LEVEL.VOLUNTEER;
            // admin 對應 officer (2) 以上
            const minLevelNeeded = requiredRoles.includes('admin') ? ROLE_LEVEL.OFFICER : ROLE_LEVEL.VOLUNTEER;

            if (userLevel >= minLevelNeeded) {
                return true;
            }

            throw new ForbiddenException('權限不足，僅管理員可存取此資源');
        }

        return true;
    }
}

/**
 * 角色階層 (向後相容)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    admin: 100,
    coordinator: 50,
    volunteer: 20,
    viewer: 10,
};

/**
 * 檢查角色是否大於等於指定角色 (向後相容)
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

