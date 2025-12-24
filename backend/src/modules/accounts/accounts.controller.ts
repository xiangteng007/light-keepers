import { Controller, Get, Param, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard, RolesGuard, MinLevel } from '../auth/guards';
import { RoleLevel } from './entities/role.entity';

// DTOs
class SetRolesDto {
    roleNames: string[];
}

class UpdatePagePermissionDto {
    requiredLevel?: number;
    isVisible?: boolean;
}

@Controller('accounts')
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.OFFICER)
    findAll() {
        return this.accountsService.findAll();
    }

    @Get('roles')
    getRoles() {
        return this.accountsService.getAllRoles();
    }

    @Get('page-permissions')
    getPagePermissions() {
        return this.accountsService.getAllPagePermissions();
    }

    /**
     * 獲取帳號列表（管理用）- 需要幹部權限
     */
    @Get('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.OFFICER)
    getAccountsForAdmin() {
        return this.accountsService.getAccountsForAdmin();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.OFFICER)
    findOne(@Param('id') id: string) {
        return this.accountsService.findById(id);
    }

    /**
     * 設定用戶角色 - 需要理事長或以上權限
     */
    @Patch(':id/roles')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.CHAIRMAN)
    async setRoles(
        @Param('id') id: string,
        @Body() body: SetRolesDto,
        @Request() req: { user: { roleLevel: number } }
    ) {
        const operatorLevel = req.user.roleLevel;
        const account = await this.accountsService.setRoles(id, body.roleNames, operatorLevel);

        // 回傳格式化的帳號資訊
        const roles = account.roles || [];
        const roleLevel = roles.length > 0
            ? Math.max(...roles.map(r => r.level))
            : 0;
        const highestRole = roles.find(r => r.level === roleLevel);

        return {
            id: account.id,
            email: account.email,
            displayName: account.displayName,
            roles: roles.map(r => r.name),
            roleLevel,
            roleDisplayName: highestRole?.displayName || '一般民眾',
        };
    }

    /**
     * 更新頁面權限配置 - 需要 Owner 權限
     */
    @Patch('page-permissions/:pageKey')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.OWNER)
    async updatePagePermission(
        @Param('pageKey') pageKey: string,
        @Body() body: UpdatePagePermissionDto,
        @Request() req: { user: { roleLevel: number } }
    ) {
        const operatorLevel = req.user.roleLevel;
        return this.accountsService.updatePagePermission(pageKey, body, operatorLevel);
    }
}

