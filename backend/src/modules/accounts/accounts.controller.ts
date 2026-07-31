import { Controller, Get, Param, Patch, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { IsArray, IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { AccountsService } from './accounts.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
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

// 定級理由（本次僅補 `getRoles`／`getPagePermissions` 兩個缺口，其餘 handler 既有定級不動）：
// `roles` 回傳完整角色清單與 level 對照，是權限枚舉／提權偵察的起點，且僅被 L3-L4 的權限管理頁使用
//   → L3（常務理事）。
// `page-permissions` 是前端導覽列可見性的設定來源，PermissionsProvider 會為「每一位」登入者載入，
//   拉高等級會讓一般志工的選單退回前端寫死的預設值 → L1（志工）；真正的防線在寫入端
//   （`PATCH page-permissions/:pageKey` 已是 OWNER）。
@Controller('accounts')
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Get()
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.OFFICER)
    findAll() {
        return this.accountsService.findAll();
    }

    @Get('roles')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.DIRECTOR)
    getRoles() {
        return this.accountsService.getAllRoles();
    }

    @Get('page-permissions')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.VOLUNTEER)
    getPagePermissions() {
        return this.accountsService.getAllPagePermissions();
    }

    /**
     * 獲取帳號列表（管理用）- 需要幹部權限
     */
    @Get('admin')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.OFFICER)
    getAccountsForAdmin() {
        return this.accountsService.getAccountsForAdmin();
    }

    @Get(':id')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.OFFICER)
    findOne(@Param('id') id: string) {
        return this.accountsService.findById(id);
    }

    /**
     * 設定用戶角色 - 需要理事長或以上權限
     */
    @Patch(':id/roles')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.CHAIRMAN)
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
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.OWNER)
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
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.CHAIRMAN)
    getPendingAccounts() {
        return this.accountsService.getPendingAccounts();
    }

    /**
     * 審批帳號 - 需要理事長或以上權限
     */
    @Patch(':id/approve')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.CHAIRMAN)
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
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.CHAIRMAN)
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
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.CHAIRMAN)
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
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(RoleLevel.CHAIRMAN)
    async blacklistAccount(
        @Param('id') id: string,
        @Body() body: { reason?: string },
        @Request() req: { user: { roleLevel: number } }
    ) {
        return this.accountsService.blacklistAccount(id, req.user.roleLevel, body.reason);
    }
}
