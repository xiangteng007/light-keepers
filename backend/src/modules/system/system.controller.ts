/**
 * System Controller
 * REST API for system administration
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SystemSettingsService, SystemSettings } from './system-settings.service';
import { SystemBackupService } from './system-backup.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

class UpdateSettingsDto implements Partial<SystemSettings> {
    siteName?: string;
    siteDescription?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    sosAlertRadius?: number;
    sosAutoAcknowledgeMinutes?: number;
    sosMaxActivePerUser?: number;
    reportAutoCloseHours?: number;
    reportRequirePhoto?: boolean;
    reportMaxPhotos?: number;
    taskDefaultPriority?: 'low' | 'medium' | 'high' | 'urgent';
    taskAutoAssign?: boolean;
    taskReminderHours?: number;
    notificationEnabled?: boolean;
    pushEnabled?: boolean;
    lineEnabled?: boolean;
    emailEnabled?: boolean;
    mapDefaultLat?: number;
    mapDefaultLng?: number;
    mapDefaultZoom?: number;
    sessionTimeoutMinutes?: number;
    maxLoginAttempts?: number;
    lockoutMinutes?: number;
    passwordMinLength?: number;
    aiEnabled?: boolean;
    aiAutoProcess?: boolean;
    aiConfidenceThreshold?: number;
}

@Controller('system')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class SystemController {
    constructor(
        private settingsService: SystemSettingsService,
        private backupService: SystemBackupService,
    ) { }

    // ==================== Settings ====================

    /**
     * Get all system settings
     */
    @Get('settings')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getSettings() {
        const settings = await this.settingsService.getSettings();
        return { success: true, data: settings };
    }

    /**
     * Update system settings
     */
    @Put('settings')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async updateSettings(@Body() dto: UpdateSettingsDto) {
        const settings = await this.settingsService.updateSettings(dto);
        return { success: true, data: settings };
    }

    /**
     * Reset settings to defaults
     */
    @Post('settings/reset')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async resetSettings() {
        const settings = await this.settingsService.resetToDefaults();
        return { success: true, data: settings };
    }

    /**
     * Toggle maintenance mode
     */
    @Post('maintenance')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async setMaintenance(@Body() body: { enabled: boolean; message?: string }) {
        await this.settingsService.setMaintenanceMode(body.enabled, body.message);
        return { success: true, message: body.enabled ? '維護模式已開啟' : '維護模式已關閉' };
    }

    // ==================== Backup ====================

    /**
     * Create a backup
     */
    @Post('backup')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async createBackup(@Body() body: { tables?: string[] }) {
        const result = await this.backupService.createBackup(body.tables);
        return { success: result.success, data: result.backup, error: result.error };
    }

    /**
     * List all backups
     */
    @Get('backups')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async listBackups() {
        const backups = await this.backupService.listBackups();
        return { success: true, data: backups };
    }

    /**
     * Restore from a backup
     */
    @Post('backup/:id/restore')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async restoreBackup(
        @Param('id') id: string,
        @Body() body: { tables?: string[] },
    ) {
        const result = await this.backupService.restoreBackup(id, body.tables);
        return { success: result.success, restored: result.restored, error: result.error };
    }

    /**
     * Delete a backup
     */
    @Delete('backup/:id')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async deleteBackup(@Param('id') id: string) {
        const deleted = await this.backupService.deleteBackup(id);
        return { success: deleted };
    }

    // ==================== System Status ====================

    /**
     * Get system status
     */
    @Get('status')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getStatus() {
        const settings = await this.settingsService.getSettings();
        const memory = process.memoryUsage();

        return {
            success: true,
            data: {
                version: process.env.APP_VERSION || '1.0.0',
                nodeVersion: process.version,
                platform: process.platform,
                uptime: Math.floor(process.uptime()),
                maintenanceMode: settings.maintenanceMode,
                memory: {
                    heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
                    heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
                    rssMB: Math.round(memory.rss / 1024 / 1024),
                },
                features: {
                    ai: settings.aiEnabled,
                    notifications: settings.notificationEnabled,
                    push: settings.pushEnabled,
                    line: settings.lineEnabled,
                },
            },
        };
    }
}
