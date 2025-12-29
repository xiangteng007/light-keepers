import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Account, Role, PagePermission } from './entities';
import { FirebaseAdminService } from '../auth/services/firebase-admin.service';

@Injectable()
export class AccountsService {
    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(PagePermission)
        private readonly pagePermissionRepository: Repository<PagePermission>,
        @Inject(forwardRef(() => FirebaseAdminService))
        private readonly firebaseAdminService: FirebaseAdminService,
    ) { }

    async findAll(): Promise<Account[]> {
        return this.accountRepository.find({ relations: ['roles'] });
    }

    async findById(id: string): Promise<Account | null> {
        return this.accountRepository.findOne({
            where: { id },
            relations: ['roles'],
        });
    }

    async findByEmail(email: string): Promise<Account | null> {
        return this.accountRepository.findOne({
            where: { email },
            relations: ['roles'],
        });
    }

    async getAllRoles(): Promise<Role[]> {
        return this.roleRepository.find({ order: { level: 'ASC' } });
    }

    async getAllPagePermissions(): Promise<PagePermission[]> {
        return this.pagePermissionRepository.find({ order: { sortOrder: 'ASC' } });
    }

    /**
     * 角色指派 - 將指定角色分配給用戶
     */
    async assignRole(accountId: string, roleName: string, operatorLevel: number): Promise<Account> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            relations: ['roles'],
        });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        const role = await this.roleRepository.findOne({ where: { name: roleName } });
        if (!role) {
            throw new NotFoundException('角色不存在');
        }

        // 只能指派比自己等級低的角色
        if (role.level >= operatorLevel) {
            throw new ForbiddenException('無法指派與自己同等或更高的角色');
        }

        // 檢查用戶現有最高等級
        const currentMaxLevel = account.roles?.length > 0
            ? Math.max(...account.roles.map(r => r.level))
            : 0;

        if (currentMaxLevel >= operatorLevel) {
            throw new ForbiddenException('無法修改權限等於或高於自己的用戶');
        }

        // 添加角色（如果尚未擁有）
        if (!account.roles) {
            account.roles = [];
        }

        if (!account.roles.some(r => r.name === roleName)) {
            account.roles.push(role);
            await this.accountRepository.save(account);
        }

        return account;
    }

    /**
     * 移除角色 - 從用戶移除指定角色
     */
    async removeRole(accountId: string, roleName: string, operatorLevel: number): Promise<Account> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            relations: ['roles'],
        });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        const role = await this.roleRepository.findOne({ where: { name: roleName } });
        if (!role) {
            throw new NotFoundException('角色不存在');
        }

        // 只能移除比自己等級低的角色
        if (role.level >= operatorLevel) {
            throw new ForbiddenException('無法移除與自己同等或更高的角色');
        }

        // 檢查用戶現有最高等級
        const currentMaxLevel = account.roles?.length > 0
            ? Math.max(...account.roles.map(r => r.level))
            : 0;

        if (currentMaxLevel >= operatorLevel) {
            throw new ForbiddenException('無法修改權限等於或高於自己的用戶');
        }

        // 移除角色
        account.roles = account.roles.filter(r => r.name !== roleName);
        await this.accountRepository.save(account);

        return account;
    }

    /**
     * 設定用戶角色 - 直接設定用戶的角色列表
     */
    async setRoles(accountId: string, roleNames: string[], operatorLevel: number): Promise<Account> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            relations: ['roles'],
        });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        // 檢查用戶現有最高等級
        const currentMaxLevel = account.roles?.length > 0
            ? Math.max(...account.roles.map(r => r.level))
            : 0;

        if (currentMaxLevel >= operatorLevel) {
            throw new ForbiddenException('無法修改權限等於或高於自己的用戶');
        }

        // 獲取要設定的角色
        const roles = await this.roleRepository.find({
            where: { name: In(roleNames) },
        });

        // 檢查是否有嘗試指派過高角色
        const maxNewLevel = roles.length > 0 ? Math.max(...roles.map(r => r.level)) : 0;
        if (maxNewLevel >= operatorLevel) {
            throw new ForbiddenException('無法指派與自己同等或更高的角色');
        }

        account.roles = roles;
        await this.accountRepository.save(account);

        return account;
    }

    /**
     * 更新頁面權限配置
     */
    async updatePagePermission(
        pageKey: string,
        updates: { requiredLevel?: number; isVisible?: boolean },
        operatorLevel: number
    ): Promise<PagePermission> {
        const pagePermission = await this.pagePermissionRepository.findOne({
            where: { pageKey },
        });

        if (!pagePermission) {
            throw new NotFoundException('頁面權限不存在');
        }

        // 只有 owner (level 5) 可以修改頁面權限
        if (operatorLevel < 5) {
            throw new ForbiddenException('只有系統擁有者可以修改頁面權限');
        }

        if (updates.requiredLevel !== undefined) {
            pagePermission.requiredLevel = updates.requiredLevel;
        }

        if (updates.isVisible !== undefined) {
            pagePermission.isVisible = updates.isVisible;
        }

        await this.pagePermissionRepository.save(pagePermission);
        return pagePermission;
    }

    /**
     * 獲取帳號列表（含角色等級資訊，用於權限管理）
     */
    async getAccountsForAdmin(): Promise<{
        id: string;
        email: string;
        displayName: string;
        roles: string[];
        roleLevel: number;
        roleDisplayName: string;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
    }[]> {
        const accounts = await this.accountRepository.find({
            relations: ['roles'],
            order: { createdAt: 'DESC' },
        });

        return accounts.map(account => {
            const roles = account.roles || [];
            const roleLevel = roles.length > 0
                ? Math.max(...roles.map(r => r.level))
                : 0;
            const highestRole = roles.find(r => r.level === roleLevel);

            return {
                id: account.id,
                email: account.email || '',
                displayName: account.displayName || '',
                roles: roles.map(r => r.name),
                roleLevel,
                roleDisplayName: highestRole?.displayName || '一般民眾',
                isActive: account.isActive,
                lastLoginAt: account.lastLoginAt,
                createdAt: account.createdAt,
            };
        });
    }

    // =========================================
    // 註冊審核相關方法
    // =========================================

    /**
     * 獲取待審核帳號列表
     */
    async getPendingAccounts(): Promise<{
        id: string;
        email: string;
        phone: string;
        displayName: string;
        createdAt: Date;
    }[]> {
        const accounts = await this.accountRepository.find({
            where: { approvalStatus: 'pending' as const },
            order: { createdAt: 'ASC' },
        });

        return accounts.map(account => ({
            id: account.id,
            email: account.email || '',
            phone: account.phone || '',
            displayName: account.displayName || '',
            createdAt: account.createdAt,
        }));
    }

    /**
     * 審批帳號
     */
    async approveAccount(accountId: string, approverId: string): Promise<{ success: boolean; message: string }> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
        });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        if (account.approvalStatus !== 'pending') {
            throw new ForbiddenException('此帳號不是待審核狀態');
        }

        account.approvalStatus = 'approved';
        account.approvedBy = approverId;
        account.approvedAt = new Date();

        await this.accountRepository.save(account);

        return {
            success: true,
            message: '帳號已審批通過',
        };
    }

    /**
     * 拒絕帳號
     */
    async rejectAccount(accountId: string, approverId: string, reason?: string): Promise<{ success: boolean; message: string }> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
        });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        if (account.approvalStatus !== 'pending') {
            throw new ForbiddenException('此帳號不是待審核狀態');
        }

        account.approvalStatus = 'rejected';
        account.approvedBy = approverId;
        account.approvedAt = new Date();
        account.approvalNote = reason || '未提供原因';

        await this.accountRepository.save(account);

        return {
            success: true,
            message: '帳號已被拒絕',
        };
    }

    /**
     * 刪除帳號 - 僅限 level 0 的帳號
     * 同時刪除 Firebase 中的用戶
     */
    async deleteAccount(accountId: string, operatorLevel: number): Promise<{ success: boolean; message: string }> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            relations: ['roles'],
        });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        // 計算被刪除帳號的權限等級
        const targetLevel = account.roles?.length > 0
            ? Math.max(...account.roles.map(r => r.level))
            : 0;

        // 只能刪除 level 0 的帳號
        if (targetLevel > 0) {
            throw new ForbiddenException('只能刪除一般民眾帳號 (level 0)');
        }

        // 刪除 Firebase 用戶（如果有 firebaseUid 或 email）
        if (account.firebaseUid) {
            await this.firebaseAdminService.deleteFirebaseUserByUid(account.firebaseUid);
        } else if (account.email) {
            await this.firebaseAdminService.deleteFirebaseUser(account.email);
        }

        // 刪除資料庫帳號
        await this.accountRepository.remove(account);

        return {
            success: true,
            message: '帳號已刪除（含 Firebase 用戶）',
        };
    }

    /**
     * 加入黑名單 (標記帳號狀態)
     */
    async blacklistAccount(accountId: string, operatorLevel: number, reason?: string): Promise<{ success: boolean; message: string }> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            relations: ['roles'],
        });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        // 計算被操作帳號的權限等級
        const targetLevel = account.roles?.length > 0
            ? Math.max(...account.roles.map(r => r.level))
            : 0;

        // 只能黑名單 level 0 的帳號
        if (targetLevel > 0) {
            throw new ForbiddenException('只能將一般民眾加入黑名單');
        }

        // 將帳號標記為停用
        account.isActive = false;
        account.approvalNote = reason ? `黑名單：${reason}` : '已加入黑名單';

        await this.accountRepository.save(account);

        return {
            success: true,
            message: '帳號已加入黑名單',
        };
    }
}
