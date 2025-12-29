import { Controller, Get, Param, Patch, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { IsArray, IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard, RolesGuard, MinLevel } from '../auth/guards';
import { RoleLevel } from './entities/role.entity';

// DTOs
class SetRolesDto {
    @IsArray()
    @IsString({ each: true })
    roleNames: string[];
}

class UpdatePagePermissionDto {
    @IsOptional()
    @IsNumber()
    requiredLevel?: number;

    @IsOptional()
    @IsBoolean()
    isVisible?: boolean;

    @IsOptional()
    @IsString()
    pageName?: string;

    @IsOptional()
    @IsNumber()
    sortOrder?: number;
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

    // =========================================
    // 註冊審核相關端點
    // =========================================

    /**
     * 獲取待審核帳號列表 - 需要理事長或以上權限
     */
    @Get('pending')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.CHAIRMAN)
    getPendingAccounts() {
        return this.accountsService.getPendingAccounts();
    }

    /**
     * 審批帳號 - 需要理事長或以上權限
     */
    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.CHAIRMAN)
    async approveAccount(
        @Param('id') id: string,
        @Request() req: { user: { id: string } }
    ) {
        return this.accountsService.approveAccount(id, req.user.id);
    }

    /**
     * 拒絕帳號 - 需要理事長或以上權限
     */
    @Patch(':id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.CHAIRMAN)
    async rejectAccount(
        @Param('id') id: string,
        @Body() body: { reason?: string },
        @Request() req: { user: { id: string } }
    ) {
        return this.accountsService.rejectAccount(id, req.user.id, body.reason);
    }

    /**
     * 刪除帳號 - 僅限一般民眾 (level 0)
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.CHAIRMAN)
    async deleteAccount(
        @Param('id') id: string,
        @Request() req: { user: { roleLevel: number } }
    ) {
        return this.accountsService.deleteAccount(id, req.user.roleLevel);
    }

    /**
     * 加入黑名單 - 僅限一般民眾 (level 0)
     */
    @Patch(':id/blacklist')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @MinLevel(RoleLevel.CHAIRMAN)
    async blacklistAccount(
        @Param('id') id: string,
        @Body() body: { reason?: string },
        @Request() req: { user: { roleLevel: number } }
    ) {
        return this.accountsService.blacklistAccount(id, req.user.roleLevel, body.reason);
    }
}
