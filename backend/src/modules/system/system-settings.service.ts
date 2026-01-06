/**
 * System Settings Service
 * Manages application-wide configuration settings
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface SystemSettings {
    // General
    siteName: string;
    siteDescription: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;

    // SOS Settings
    sosAlertRadius: number; // km
    sosAutoAcknowledgeMinutes: number;
    sosMaxActivePerUser: number;

    // Report Settings
    reportAutoCloseHours: number;
    reportRequirePhoto: boolean;
    reportMaxPhotos: number;

    // Task Settings
    taskDefaultPriority: 'low' | 'medium' | 'high' | 'urgent';
    taskAutoAssign: boolean;
    taskReminderHours: number;

    // Notification Settings
    notificationEnabled: boolean;
    pushEnabled: boolean;
    lineEnabled: boolean;
    emailEnabled: boolean;

    // Map Settings
    mapDefaultLat: number;
    mapDefaultLng: number;
    mapDefaultZoom: number;

    // Security
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    lockoutMinutes: number;
    passwordMinLength: number;

    // AI Settings
    aiEnabled: boolean;
    aiAutoProcess: boolean;
    aiConfidenceThreshold: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
    siteName: '光守護者災防平台',
    siteDescription: 'Lightkeepers AI Disaster Prevention Platform',
    maintenanceMode: false,
    maintenanceMessage: '系統維護中，請稍後再試',

    sosAlertRadius: 5,
    sosAutoAcknowledgeMinutes: 30,
    sosMaxActivePerUser: 1,

    reportAutoCloseHours: 72,
    reportRequirePhoto: false,
    reportMaxPhotos: 5,

    taskDefaultPriority: 'medium',
    taskAutoAssign: false,
    taskReminderHours: 24,

    notificationEnabled: true,
    pushEnabled: true,
    lineEnabled: true,
    emailEnabled: false,

    mapDefaultLat: 25.0330,
    mapDefaultLng: 121.5654,
    mapDefaultZoom: 12,

    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    passwordMinLength: 8,

    aiEnabled: true,
    aiAutoProcess: true,
    aiConfidenceThreshold: 0.7,
};

@Injectable()
export class SystemSettingsService {
    private readonly logger = new Logger(SystemSettingsService.name);
    private readonly SETTINGS_KEY = 'system:settings';
    private settingsCache: SystemSettings | null = null;

    constructor(private cache: CacheService) {
        this.loadSettings();
    }

    /**
     * Get all settings
     */
    async getSettings(): Promise<SystemSettings> {
        if (this.settingsCache) {
            return this.settingsCache;
        }

        await this.loadSettings();
        return this.settingsCache || DEFAULT_SETTINGS;
    }

    /**
     * Get a single setting value
     */
    async get<K extends keyof SystemSettings>(key: K): Promise<SystemSettings[K]> {
        const settings = await this.getSettings();
        return settings[key];
    }

    /**
     * Update settings
     */
    async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
        const current = await this.getSettings();
        const newSettings = { ...current, ...updates };

        await this.cache.set(this.SETTINGS_KEY, newSettings, { ttl: 0 }); // No expiry
        this.settingsCache = newSettings;

        this.logger.log('System settings updated');
        return newSettings;
    }

    /**
     * Reset settings to defaults
     */
    async resetToDefaults(): Promise<SystemSettings> {
        await this.cache.set(this.SETTINGS_KEY, DEFAULT_SETTINGS, { ttl: 0 });
        this.settingsCache = DEFAULT_SETTINGS;

        this.logger.log('System settings reset to defaults');
        return DEFAULT_SETTINGS;
    }

    /**
     * Check if system is in maintenance mode
     */
    async isMaintenanceMode(): Promise<boolean> {
        const settings = await this.getSettings();
        return settings.maintenanceMode;
    }

    /**
     * Toggle maintenance mode
     */
    async setMaintenanceMode(enabled: boolean, message?: string): Promise<void> {
        const updates: Partial<SystemSettings> = { maintenanceMode: enabled };
        if (message) {
            updates.maintenanceMessage = message;
        }
        await this.updateSettings(updates);
    }

    // ==================== Private Methods ====================

    private async loadSettings(): Promise<void> {
        try {
            const cached = await this.cache.get<SystemSettings>(this.SETTINGS_KEY);
            this.settingsCache = cached ? { ...DEFAULT_SETTINGS, ...cached } : DEFAULT_SETTINGS;
        } catch (error) {
            this.logger.error('Failed to load settings', error);
            this.settingsCache = DEFAULT_SETTINGS;
        }
    }
}
