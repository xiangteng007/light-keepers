import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleLevel, PagePermission } from './entities';

/**
 * 初始化角色和頁面權限的 Seed 服務
 * 在應用啟動時自動執行
 */
@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(PagePermission)
        private readonly pagePermissionRepository: Repository<PagePermission>,
    ) { }

    async onModuleInit() {
        try {
            await this.seedRoles();
            await this.seedPagePermissions();
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
            { pageKey: 'dashboard', pageName: '儀表板', pagePath: '/dashboard', requiredLevel: RoleLevel.VOLUNTEER, icon: 'LayoutDashboard', sortOrder: 1 },
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
        ];

        for (const pageData of pages) {
            const existing = await this.pagePermissionRepository.findOne({ where: { pageKey: pageData.pageKey } });
            if (!existing) {
                await this.pagePermissionRepository.save({ ...pageData, isVisible: true });
                this.logger.log(`Created page permission: ${pageData.pageName}`);
            } else {
                // 更新現有設定
                await this.pagePermissionRepository.update(existing.id, pageData);
            }
        }
    }
}
