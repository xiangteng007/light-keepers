/**
 * geo-intel-hub.service.ts
 * 
 * v4.0: 地理情報中心 - 整合天氣/NCDR/社群情資
 * 
 * 不重複實作，而是作為 Facade 統一串接:
 * - WeatherService
 * - WeatherForecastService
 * - NcdrAlertsService
 * - SocialMediaMonitorService
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GEO_EVENTS } from '../../common/events';

// 整合後的 Alert 類型
export interface GeoAlert {
    id: string;
    source: 'ncdr' | 'weather' | 'cwa' | 'social' | 'manual';
    type: string;
    severity: 'info' | 'advisory' | 'watch' | 'warning' | 'critical';
    title: string;
    description: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    affectedAreas?: string[];
    startTime: Date;
    endTime?: Date;
    urgency?: number;
    data?: Record<string, any>;
}

export interface GeoIntelSummary {
    totalAlerts: number;
    bySource: Record<string, number>;
    bySeverity: Record<string, number>;
    criticalCount: number;
    lastUpdated: Date;
}

@Injectable()
export class GeoIntelHubService implements OnModuleInit {
    private readonly logger = new Logger(GeoIntelHubService.name);

    // 快取整合後的警報
    private geoAlerts: Map<string, GeoAlert> = new Map();
    private lastSummary: GeoIntelSummary | null = null;

    constructor(
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        this.logger.log('🌍 GeoIntelHub initialized');
    }

    // ===== 整合查詢 =====

    /**
     * 取得所有來源的整合警報
     */
    getActiveAlerts(filter?: {
        source?: string;
        severity?: string;
        location?: string;
        limit?: number;
    }): GeoAlert[] {
        let alerts = Array.from(this.geoAlerts.values());

        if (filter?.source) {
            alerts = alerts.filter(a => a.source === filter.source);
        }
        if (filter?.severity) {
            alerts = alerts.filter(a => a.severity === filter.severity);
        }
        if (filter?.location) {
            alerts = alerts.filter(a =>
                a.location?.includes(filter.location!) ||
                a.affectedAreas?.some(area => area.includes(filter.location!))
            );
        }

        // 依嚴重度排序
        alerts.sort((a, b) => this.severityOrder(b.severity) - this.severityOrder(a.severity));

        return alerts.slice(0, filter?.limit || 100);
    }

    /**
     * 取得地圖用的警報 (含座標)
     */
    getMapAlerts(): GeoAlert[] {
        return Array.from(this.geoAlerts.values())
            .filter(a => a.latitude && a.longitude);
    }

    /**
     * 取得情報摘要
     */
    getSummary(): GeoIntelSummary {
        if (this.lastSummary && Date.now() - this.lastSummary.lastUpdated.getTime() < 60000) {
            return this.lastSummary;
        }

        const alerts = Array.from(this.geoAlerts.values());
        const bySource: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};
        let criticalCount = 0;

        for (const alert of alerts) {
            bySource[alert.source] = (bySource[alert.source] || 0) + 1;
            bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
            if (alert.severity === 'critical' || alert.severity === 'warning') criticalCount++;
        }

        this.lastSummary = {
            totalAlerts: alerts.length,
            bySource,
            bySeverity,
            criticalCount,
            lastUpdated: new Date(),
        };

        return this.lastSummary;
    }

    // ===== 事件監聽整合 =====

    @OnEvent(GEO_EVENTS.ALERT_RECEIVED)
    handleAlertReceived(payload: any) {
        this.addAlert({
            id: `alert-${payload.source}-${Date.now()}`,
            source: payload.source || 'manual',
            type: payload.type || 'general',
            severity: this.mapUrgencyToSeverity(payload.urgency || 5),
            title: payload.title || '警報',
            description: payload.content || payload.description,
            location: payload.location,
            latitude: payload.latitude,
            longitude: payload.longitude,
            startTime: new Date(),
            urgency: payload.urgency,
            data: payload,
        });
    }

    @OnEvent(GEO_EVENTS.WEATHER_UPDATED)
    handleWeatherUpdated(payload: any) {
        if (payload.alerts?.length) {
            for (const alert of payload.alerts) {
                this.addAlert({
                    id: `weather-${alert.id || Date.now()}`,
                    source: 'weather',
                    type: alert.type || 'weather',
                    severity: alert.severity || 'advisory',
                    title: alert.title,
                    description: alert.description,
                    affectedAreas: alert.affectedAreas,
                    startTime: new Date(alert.startTime),
                    endTime: alert.endTime ? new Date(alert.endTime) : undefined,
                });
            }
        }
    }

    @OnEvent(GEO_EVENTS.SOCIAL_INTEL_DETECTED)
    handleSocialIntel(payload: any) {
        if (payload.urgency >= 6) {
            this.addAlert({
                id: `social-${payload.postId}`,
                source: 'social',
                type: 'social_intel',
                severity: this.mapUrgencyToSeverity(payload.urgency),
                title: `社群情資: ${payload.keywords?.join(', ') || '災情回報'}`,
                description: `${payload.platform} 偵測到相關貼文`,
                location: payload.location,
                startTime: new Date(),
                urgency: payload.urgency,
                data: payload,
            });
        }
    }

    // ===== 批次匯入 (供外部服務呼叫) =====

    /**
     * 從 NCDR 同步結果匯入
     */
    importFromNcdr(ncdrAlerts: any[]): number {
        let imported = 0;
        for (const alert of ncdrAlerts) {
            this.addAlert({
                id: `ncdr-${alert.id}`,
                source: 'ncdr',
                type: alert.alertType || 'ncdr',
                severity: this.mapStatusToSeverity(alert.status),
                title: alert.title,
                description: alert.description || alert.summary,
                location: alert.location,
                latitude: alert.latitude,
                longitude: alert.longitude,
                affectedAreas: alert.affectedAreas,
                startTime: new Date(alert.publishedAt || alert.effectiveTime),
                endTime: alert.expiresAt ? new Date(alert.expiresAt) : undefined,
                data: alert,
            });
            imported++;
        }
        return imported;
    }

    /**
     * 從天氣服務匯入
     */
    importFromWeather(weatherAlerts: any[]): number {
        let imported = 0;
        for (const alert of weatherAlerts) {
            this.addAlert({
                id: `cwa-${alert.id || Date.now()}`,
                source: 'cwa',
                type: alert.type || 'weather',
                severity: alert.severity || 'advisory',
                title: alert.title,
                description: alert.description,
                affectedAreas: alert.affectedAreas,
                startTime: new Date(alert.startTime),
                endTime: alert.endTime ? new Date(alert.endTime) : undefined,
            });
            imported++;
        }
        return imported;
    }

    // ===== 外部 API 同步 (Phase 9) =====

    /**
     * 同步外部 API (Mock)
     */
    async syncWithExternalApis() {
        this.logger.log('🔄 Syncing with external APIs...');

        // 1. 消防署 119 (Mock)
        const fireAlerts = [
            {
                id: `fire-119-${Date.now()}`,
                source: 'ncdr', // 暫用 ncdr 類別
                type: 'fire',
                severity: 'critical',
                title: '【119 派遣】工廠火警',
                description: '新北市新莊區化成路... 工廠冒出黑煙',
                location: '新北市新莊區',
                latitude: 25.043,
                longitude: 121.467,
                startTime: new Date(),
            }
        ];
        this.importFromNcdr(fireAlerts);

        // 2. 氣象局 (Mock)
        const weatherAlerts = [
            {
                id: `wx-${Date.now()}`,
                type: 'rain',
                severity: 'warning',
                title: '豪雨特報',
                description: '受到低壓帶影響，今日北部地區有局部豪雨...',
                affectedAreas: ['台北市', '新北市', '基隆市'],
                startTime: new Date(),
            }
        ];
        this.importFromWeather(weatherAlerts);

        return { synced: true, timestamp: new Date() };
    }

    // ===== 定時清理 =====

    @Cron(CronExpression.EVERY_HOUR)
    cleanExpiredAlerts() {
        const now = Date.now();
        let cleaned = 0;

        for (const [id, alert] of this.geoAlerts) {
            // 24小時過期
            if (now - alert.startTime.getTime() > 24 * 3600 * 1000) {
                this.geoAlerts.delete(id);
                cleaned++;
            }
            // 有結束時間且已過期
            if (alert.endTime && alert.endTime.getTime() < now) {
                this.geoAlerts.delete(id);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.log(`Cleaned ${cleaned} expired alerts`);
        }
    }

    // ===== 私有方法 =====

    private addAlert(alert: GeoAlert) {
        this.geoAlerts.set(alert.id, alert);
        this.lastSummary = null; // 清除快取

        // 發送整合事件
        this.eventEmitter.emit('geo.intel.updated', {
            alert,
            totalAlerts: this.geoAlerts.size,
        });
    }

    private severityOrder(severity: string): number {
        switch (severity) {
            case 'critical': return 5;
            case 'warning': return 4;
            case 'watch': return 3;
            case 'advisory': return 2;
            default: return 1;
        }
    }

    private mapUrgencyToSeverity(urgency: number): GeoAlert['severity'] {
        if (urgency >= 9) return 'critical';
        if (urgency >= 7) return 'warning';
        if (urgency >= 5) return 'watch';
        if (urgency >= 3) return 'advisory';
        return 'info';
    }

    private mapStatusToSeverity(status: string): GeoAlert['severity'] {
        switch (status?.toLowerCase()) {
            case 'actual': case 'urgent': return 'warning';
            case 'alert': return 'watch';
            case 'update': return 'advisory';
            default: return 'info';
        }
    }
}
