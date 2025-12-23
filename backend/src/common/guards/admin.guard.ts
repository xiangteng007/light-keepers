import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * 角色類型
 */
export type UserRole = 'admin' | 'coordinator' | 'volunteer' | 'viewer';

/**
 * 角色裝飾器 - 用於標記需要特定角色的端點
 */
export const Roles = Reflector.createDecorator<UserRole[]>();

/**
 * 管理員權限守衛
 * 檢查使用者是否具有管理員角色
 */
@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get(Roles, context.getHandler());

        // 如果沒有指定角色要求，允許存取
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // 沒有使用者資訊時拒絕存取
        if (!user) {
            throw new ForbiddenException('需要登入才能存取此資源');
        }

        // 檢查使用者角色是否在允許列表中
        const hasRole = requiredRoles.some((role) => user.role === role);

        if (!hasRole) {
            throw new ForbiddenException('權限不足，僅管理員可存取志工資料庫');
        }

        return true;
    }
}

/**
 * 角色階層
 * admin > coordinator > volunteer > viewer
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    admin: 100,
    coordinator: 50,
    volunteer: 20,
    viewer: 10,
};

/**
 * 檢查角色是否大於等於指定角色
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
