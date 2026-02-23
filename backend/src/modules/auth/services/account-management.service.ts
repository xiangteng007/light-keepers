/**
 * Account Management Service
 * 
 * Handles account profile, preferences, password management,
 * account status, and permission queries.
 * Extracted from AuthService to maintain single responsibility.
 */

import {
    Injectable,
    Logger,
    UnauthorizedException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { Role } from '../../accounts/entities/role.entity';
import { PagePermission } from '../../accounts/entities/page-permission.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AccountManagementService {
    private readonly logger = new Logger(AccountManagementService.name);

    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(PagePermission)
        private readonly pagePermissionRepository: Repository<PagePermission>,
    ) {}

    // =========================================
    // 帳號查詢
    // =========================================

    /**
     * 獲取帳號資料（含綁定狀態與角色）
     */
    async getAccountById(id: string): Promise<Account | null> {
        return this.accountRepository.findOne({
            where: { id },
            relations: ['roles'],
        });
    }

    /**
     * 獲取頁面權限配置
     */
    async getPagePermissions(): Promise<PagePermission[]> {
        return this.pagePermissionRepository.find({
            where: { isVisible: true },
            order: { sortOrder: 'ASC' },
        });
    }

    /**
     * 獲取所有角色
     */
    async getAllRoles(): Promise<Role[]> {
        return this.roleRepository.find({
            order: { level: 'ASC' },
        });
    }

    // =========================================
    // 個人資料管理
    // =========================================

    /**
     * 更新個人資料
     */
    async updateProfile(accountId: string, data: { displayName?: string; avatarUrl?: string }): Promise<{
        id: string;
        displayName: string;
        avatarUrl: string;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        if (data.displayName !== undefined) {
            account.displayName = data.displayName;
        }

        if (data.avatarUrl !== undefined) {
            account.avatarUrl = data.avatarUrl;
        }

        await this.accountRepository.save(account);

        return {
            id: account.id,
            displayName: account.displayName,
            avatarUrl: account.avatarUrl,
        };
    }

    // =========================================
    // 密碼管理
    // =========================================

    /**
     * 檢查帳號是否已設定密碼
     */
    async hasPassword(accountId: string): Promise<{ hasPassword: boolean }> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            select: ['id', 'passwordHash'],
        });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        return {
            hasPassword: !!(account.passwordHash && account.passwordHash.length > 0)
        };
    }

    /**
     * 變更密碼
     */
    async changePassword(accountId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        // 驗證舊密碼
        const isValid = await bcrypt.compare(currentPassword, account.passwordHash);
        if (!isValid) {
            throw new UnauthorizedException('目前密碼不正確');
        }

        // 更新密碼
        account.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.accountRepository.save(account);

        return { success: true };
    }

    /**
     * 設定密碼（針對 OAuth 帳號）
     * 只有沒有密碼的帳號可以使用此方法
     */
    async setPassword(accountId: string, newPassword: string): Promise<{ success: boolean }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        // 檢查是否已有密碼（非空字串表示已設定）
        if (account.passwordHash && account.passwordHash.length > 0) {
            throw new BadRequestException('此帳號已設定密碼，請使用「變更密碼」功能');
        }

        // 設定新密碼
        account.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.accountRepository.save(account);

        return { success: true };
    }

    /**
     * 管理員設定密碼（用於緊急重設）
     * 可為任何帳號設定密碼
     */
    async adminSetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        const account = await this.accountRepository.findOne({ where: { email } });
        if (!account) {
            throw new NotFoundException(`帳號不存在: ${email}`);
        }

        // 設定新密碼
        account.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.accountRepository.save(account);

        this.logger.log(`Admin set password for account: ${email}`);
        return { success: true, message: `密碼已設定成功 for ${email}` };
    }

    /**
     * 重建系統擁有者帳號
     * 刪除現有帳號並建立新的
     */
    async recreateOwnerAccount(email: string, password: string): Promise<{ success: boolean; message: string; accountId?: string }> {
        // 1. 刪除現有帳號
        const existingAccount = await this.accountRepository.findOne({ where: { email } });
        if (existingAccount) {
            await this.accountRepository.delete({ id: existingAccount.id });
            this.logger.log(`Deleted existing account: ${email}`);
        }

        // 2. 找到系統擁有者角色
        const ownerRole = await this.roleRepository.findOne({ where: { name: 'owner' } });
        if (!ownerRole) {
            throw new NotFoundException('系統擁有者角色不存在，請先執行 seed');
        }

        // 3. 建立新帳號
        const passwordHash = await bcrypt.hash(password, 10);
        const newAccount = this.accountRepository.create({
            email,
            passwordHash,
            displayName: '系統擁有者',
            isActive: true,
            emailVerified: true,
            roles: [ownerRole],
        });

        await this.accountRepository.save(newAccount);
        this.logger.log(`Created new owner account: ${email} with id: ${newAccount.id}`);

        return {
            success: true,
            message: `系統擁有者帳號已重建: ${email}`,
            accountId: newAccount.id,
        };
    }

    // =========================================
    // 偏好設定
    // =========================================

    /**
     * 更新通知偏好設定
     */
    async updatePreferences(accountId: string, data: {
        alertNotifications?: boolean;
        taskNotifications?: boolean;
        trainingNotifications?: boolean;
    }): Promise<{
        alertNotifications: boolean;
        taskNotifications: boolean;
        trainingNotifications: boolean;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        if (data.alertNotifications !== undefined) {
            account.prefAlertNotifications = data.alertNotifications;
        }

        if (data.taskNotifications !== undefined) {
            account.prefTaskNotifications = data.taskNotifications;
        }

        if (data.trainingNotifications !== undefined) {
            account.prefTrainingNotifications = data.trainingNotifications;
        }

        await this.accountRepository.save(account);

        return {
            alertNotifications: account.prefAlertNotifications,
            taskNotifications: account.prefTaskNotifications,
            trainingNotifications: account.prefTrainingNotifications,
        };
    }

    /**
     * 獲取通知偏好設定
     */
    async getPreferences(accountId: string): Promise<{
        alertNotifications: boolean;
        taskNotifications: boolean;
        trainingNotifications: boolean;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        return {
            alertNotifications: account.prefAlertNotifications ?? true,
            taskNotifications: account.prefTaskNotifications ?? true,
            trainingNotifications: account.prefTrainingNotifications ?? true,
        };
    }

    // =========================================
    // 帳號狀態
    // =========================================

    /**
     * 獲取帳號完整狀態
     */
    async getAccountStatus(accountId: string): Promise<{
        approvalStatus: string;
        phoneVerified: boolean;
        emailVerified: boolean;
        volunteerProfileCompleted: boolean;
        needsSetup: boolean;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        const needsSetup = !account.volunteerProfileCompleted && account.approvalStatus === 'approved';

        return {
            approvalStatus: account.approvalStatus,
            phoneVerified: account.phoneVerified,
            emailVerified: account.emailVerified,
            volunteerProfileCompleted: account.volunteerProfileCompleted,
            needsSetup,
        };
    }

    /**
     * 標記志工資料已完成
     */
    async markVolunteerProfileCompleted(accountId: string): Promise<{ success: boolean }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        account.volunteerProfileCompleted = true;
        await this.accountRepository.save(account);

        return { success: true };
    }
}
