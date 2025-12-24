import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../accounts/entities';
import { RoleLevel } from '../../accounts/entities/role.entity';
import { Request } from 'express';

/**
 * 最低權限等級 Decorator
 * @param level 最低權限等級 (使用 RoleLevel enum)
 * @example @MinLevel(RoleLevel.OFFICER) // 需要 officer 或以上權限
 */
export const MIN_LEVEL_KEY = 'minLevel';
export const MinLevel = (level: RoleLevel) => SetMetadata(MIN_LEVEL_KEY, level);

/**
 * 角色名稱 Decorator
 * @param roles 允許的角色名稱陣列
 * @example @Roles('owner', 'chairman') // 僅限 owner 或 chairman
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

interface RequestWithUser extends Request {
    user?: Account;
}

/**
 * 角色權限 Guard
 * 支援兩種模式：
 * 1. MinLevel - 基於等級的階層式權限 (推薦)
 * 2. Roles - 基於角色名稱的權限
 * 
 * 注意：此 Guard 需要在 JwtAuthGuard 之後使用
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly jwtService: JwtService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 獲取 decorator 設定的權限需求
        const minLevel = this.reflector.getAllAndOverride<RoleLevel>(MIN_LEVEL_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // 如果沒有設定權限需求，則允許訪問
        if (minLevel === undefined && !requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest<RequestWithUser>();

        // 如果已經有 user (由 JwtAuthGuard 設定)，直接使用
        let user = request.user;

        // 如果沒有 user，嘗試從 token 獲取
        if (!user) {
            const token = this.extractTokenFromHeader(request);
            if (!token) {
                return false; // 未登入
            }

            try {
                const payload = this.jwtService.verify(token);
                const foundUser = await this.accountRepository.findOne({
                    where: { id: payload.sub },
                    relations: ['roles'],
                });

                if (!foundUser) {
                    return false;
                }

                user = foundUser;
                request.user = user;
            } catch {
                return false;
            }
        }

        const userRoles = user.roles || [];
        const userLevel = userRoles.length > 0
            ? Math.max(...userRoles.map(r => r.level || 0))
            : 0;

        // 檢查等級需求
        if (minLevel !== undefined && userLevel < minLevel) {
            return false;
        }

        // 檢查角色名稱需求
        if (requiredRoles && requiredRoles.length > 0) {
            const userRoleNames = userRoles.map(r => r.name);
            const hasRequiredRole = requiredRoles.some(role => userRoleNames.includes(role));
            if (!hasRequiredRole) {
                return false;
            }
        }

        return true;
    }

    private extractTokenFromHeader(request: Request): string | null {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : null;
    }
}
