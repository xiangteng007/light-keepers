import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleLevel, PagePermission } from './entities';
import { Account } from './entities/account.entity';

/**
 * 初始化角色和頁面權限的 Seed 服務
 * 在應用啟動時自動執行
 */
@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    // 系統擁有者帳號 Email
    private readonly OWNER_EMAIL = 'xiangteng007@gmail.com';

    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(PagePermission)
        private readonly pagePermissionRepository: Repository<PagePermission>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) { }

    async onModuleInit() {
        try {
            await this.seedRoles();
            await this.seedPagePermissions();
            await this.fixDashboardPermission(); // 一次性修復
            await this.seedOwnerAccount();
            this.logger.log('Seed completed successfully');
        } catch (error) {
            this.logger.error(`Seed failed: ${error.message}`);
            // Don't throw - allow app to start even if seed fails
        }
    }

    /**
     * 初始化 6 個角色層級
     */
    async seedRoles() {
        // 清理舊版本的無效角色
        const legacyRolesToDelete = ['eoc', 'leader', 'admin'];
        for (const legacyName of legacyRolesToDelete) {
            const legacyRole = await this.roleRepository.findOne({ where: { name: legacyName } });
            if (legacyRole) {
                await this.roleRepository.delete(legacyRole.id);
                this.logger.log(`Deleted legacy role: ${legacyName}`);
            }
        }

        const roles = [
            { name: 'public', displayName: '一般民眾', level: RoleLevel.PUBLIC, description: '未登入用戶' },
            { name: 'volunteer', displayName: '登記志工', level: RoleLevel.VOLUNTEER, description: '已註冊志工' },
            { name: 'officer', displayName: '幹部', level: RoleLevel.OFFICER, description: '志工幹部' },
            { name: 'director', displayName: '常務理事', level: RoleLevel.DIRECTOR, description: '常務理事' },
            { name: 'chairman', displayName: '理事長', level: RoleLevel.CHAIRMAN, description: '理事長' },
            { name: 'owner', displayName: '系統擁有者', level: RoleLevel.OWNER, description: '最高權限' },
        ];

        for (const roleData of roles) {
            const existing = await this.roleRepository.findOne({ where: { name: roleData.name } });
            if (!existing) {
                await this.roleRepository.save(roleData);
                this.logger.log(`Created role: ${roleData.displayName}`);
            } else {
                // 更新現有角色的 level 和 displayName
                await this.roleRepository.update(existing.id, {
                    displayName: roleData.displayName,
                    level: roleData.level,
                    description: roleData.description,
                });
            }
        }
    }

    /**
     * 初始化頁面權限配置
     */
    async seedPagePermissions() {
        const pages = [
            { pageKey: 'dashboard', pageName: '儀表板', pagePath: '/dashboard', requiredLevel: RoleLevel.PUBLIC, icon: 'LayoutDashboard', sortOrder: 1 },
            { pageKey: 'analytics', pageName: '數據分析', pagePath: '/analytics', requiredLevel: RoleLevel.DIRECTOR, icon: 'BarChart3', sortOrder: 2 },
            { pageKey: 'ncdr-alerts', pageName: '災害示警', pagePath: '/ncdr-alerts', requiredLevel: RoleLevel.PUBLIC, icon: 'AlertTriangle', sortOrder: 3 },
            { pageKey: 'events', pageName: '災情事件', pagePath: '/events', requiredLevel: RoleLevel.VOLUNTEER, icon: 'Siren', sortOrder: 4 },
            { pageKey: 'tasks', pageName: '任務管理', pagePath: '/tasks', requiredLevel: RoleLevel.OFFICER, icon: 'ClipboardList', sortOrder: 5 },
            { pageKey: 'map', pageName: '地圖總覽', pagePath: '/map', requiredLevel: RoleLevel.PUBLIC, icon: 'Map', sortOrder: 6 },
            { pageKey: 'manuals', pageName: '實務手冊', pagePath: '/manuals', requiredLevel: RoleLevel.PUBLIC, icon: 'BookOpen', sortOrder: 7 },
            { pageKey: 'report', pageName: '回報系統', pagePath: '/report', requiredLevel: RoleLevel.VOLUNTEER, icon: 'MessageSquareWarning', sortOrder: 8 },
            { pageKey: 'reports-admin', pageName: '回報審核', pagePath: '/reports/admin', requiredLevel: RoleLevel.OFFICER, icon: 'CheckSquare', sortOrder: 9 },
            { pageKey: 'reports-export', pageName: '報表匯出', pagePath: '/reports/export', requiredLevel: RoleLevel.DIRECTOR, icon: 'FileDown', sortOrder: 10 },
            { pageKey: 'volunteers', pageName: '志工管理', pagePath: '/volunteers', requiredLevel: RoleLevel.OFFICER, icon: 'Users', sortOrder: 11 },
            { pageKey: 'volunteers-schedule', pageName: '志工排班', pagePath: '/volunteers/schedule', requiredLevel: RoleLevel.OFFICER, icon: 'CalendarDays', sortOrder: 12 },
            { pageKey: 'training', pageName: '培訓中心', pagePath: '/training', requiredLevel: RoleLevel.VOLUNTEER, icon: 'GraduationCap', sortOrder: 13 },
            { pageKey: 'resources', pageName: '物資管理', pagePath: '/resources', requiredLevel: RoleLevel.OFFICER, icon: 'Package', sortOrder: 14 },
            { pageKey: 'notifications', pageName: '通知中心', pagePath: '/notifications', requiredLevel: RoleLevel.VOLUNTEER, icon: 'Bell', sortOrder: 15 },
            { pageKey: 'permissions', pageName: '權限管理', pagePath: '/permissions', requiredLevel: RoleLevel.OWNER, icon: 'Shield', sortOrder: 16 },
            { pageKey: 'donations', pageName: '捐款管理', pagePath: '/donations', requiredLevel: RoleLevel.OWNER, icon: 'Heart', sortOrder: 17 },
        ];

        for (const pageData of pages) {
            const existing = await this.pagePermissionRepository.findOne({ where: { pageKey: pageData.pageKey } });
            if (!existing) {
                await this.pagePermissionRepository.save({ ...pageData, isVisible: true });
                this.logger.log(`Created page permission: ${pageData.pageName}`);
            }
            // 不再覆蓋現有設定 - 允許管理員透過 UI 修改
        }
    }

    /**
     * 一次性修復：將 dashboard 的權限設為 PUBLIC (0)
     */
    async fixDashboardPermission() {
        const dashboard = await this.pagePermissionRepository.findOne({ where: { pageKey: 'dashboard' } });
        if (dashboard && dashboard.requiredLevel !== RoleLevel.PUBLIC) {
            await this.pagePermissionRepository.update(dashboard.id, { requiredLevel: RoleLevel.PUBLIC });
            this.logger.log('🔧 Fixed dashboard permission to PUBLIC (0)');
        }
    }

    /**
     * 確保系統擁有者帳號擁有 owner 角色
     * 在每次啟動時檢查並修復角色遺失問題
     */
    async seedOwnerAccount() {
        // 搜尋所有可能的 owner 帳號（email 或 googleEmail 匹配）
        const ownerAccounts = await this.accountRepository.find({
            where: [
                { email: this.OWNER_EMAIL },
                { googleEmail: this.OWNER_EMAIL },
            ],
            relations: ['roles'],
        });

        if (ownerAccounts.length === 0) {
            this.logger.log(`Owner account ${this.OWNER_EMAIL} not found, skipping role assignment`);
            return;
        }

        const ownerRole = await this.roleRepository.findOne({ where: { name: 'owner' } });
        if (!ownerRole) {
            this.logger.warn('Owner role not found');
            return;
        }

        // 為每個匹配的帳號確保有 owner 角色
        for (const ownerAccount of ownerAccounts) {
            const hasOwnerRole = ownerAccount.roles?.some(r => r.name === 'owner');

            if (hasOwnerRole) {
                this.logger.log(`Account ${ownerAccount.email || ownerAccount.googleEmail} already has owner role`);
                continue;
            }

            // 賦予 owner 角色（使用 QueryBuilder 確保不會清空其他角色）
            this.logger.warn(`⚠️ Owner account ${ownerAccount.id} is missing owner role - fixing now...`);

            // 直接插入到 account_roles 關聯表
            await this.accountRepository
                .createQueryBuilder()
                .relation(Account, 'roles')
                .of(ownerAccount.id)
                .add(ownerRole.id);

            // 更新帳號狀態
            await this.accountRepository.update(ownerAccount.id, {
                approvalStatus: 'approved',
                phoneVerified: true,
                emailVerified: true,
                volunteerProfileCompleted: true,
            });

            this.logger.log(`✅ Granted owner role to account ${ownerAccount.id} (${ownerAccount.email || ownerAccount.googleEmail})`);
        }
    }
}
