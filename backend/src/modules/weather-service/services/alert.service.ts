import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CwaApiService, CWA_DATASETS } from './cwa-api.service';

export interface WeatherAlert {
    id: string;
    type: 'typhoon' | 'flood' | 'earthquake' | 'landslide' | 'tsunami' | 'heavy_rain' | 'strong_wind' | 'other';
    severity: 'advisory' | 'watch' | 'warning' | 'emergency';
    title: string;
    description: string;
    affectedAreas: string[];
    startTime: Date;
    endTime?: Date;
    source: 'cwb' | 'ncdr' | 'manual';
    coordinates?: { lat: number; lng: number; radius: number };
    isActive: boolean;
    createdAt: Date;
}

export interface AlertSubscription {
    id: string;
    userId: string;
    alertTypes: string[];
    regions: string[];
    channels: ('push' | 'sms' | 'email' | 'line')[];
    enabled: boolean;
}

export interface MissionWeatherLink {
    missionId: string;
    alertId: string;
    autoTrigger: boolean;
    actions: ('notify_team' | 'suspend_outdoor' | 'evacuate' | 'standby')[];
}

/**
 * 氣象警報服務
 * 
 * 整合：
 * - CWA 警報同步
 * - 警報訂閱管理
 * - 任務天氣連結
 * - 自動通知觸發
 */
@Injectable()
export class AlertService {
    private readonly logger = new Logger(AlertService.name);
    
    private alerts: Map<string, WeatherAlert> = new Map();
    private subscriptions: Map<string, AlertSubscription> = new Map();
    private missionLinks: Map<string, MissionWeatherLink> = new Map();

    constructor(
        private readonly cwaApi: CwaApiService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.initSampleAlerts();
    }

    // === Alert Management ===

    /**
     * 從 CWA 同步警報
     */
    async syncFromCwa(): Promise<number> {
        const data = await this.cwaApi.fetch(CWA_DATASETS.ALERTS);
        
        if (!data?.dataset?.datasetInfo) {
            this.logger.warn('No CWA alert data received');
            return 0;
        }

        let count = 0;
        for (const info of data.dataset.datasetInfo) {
            const alert = this.parseAlertFromCwa(info);
            if (alert) {
                this.alerts.set(alert.id, alert);
                count++;
            }
        }

        this.logger.log(`Synced ${count} alerts from CWA`);
        return count;
    }

    /**
     * 建立手動警報
     */
    createAlert(data: Omit<WeatherAlert, 'id' | 'createdAt'>): WeatherAlert {
        const alert: WeatherAlert = {
            ...data,
            id: `alert-${Date.now()}`,
            createdAt: new Date(),
        };

        this.alerts.set(alert.id, alert);
        
        // 觸發通知
        this.triggerAlertNotifications(alert);
        
        return alert;
    }

    /**
     * 取得所有有效警報
     */
    getActiveAlerts(): WeatherAlert[] {
        return Array.from(this.alerts.values()).filter(a => a.isActive);
    }

    /**
     * 依區域取得警報
     */
    getAlertsByRegion(region: string): WeatherAlert[] {
        return this.getActiveAlerts().filter(a => 
            a.affectedAreas.some(area => area.includes(region))
        );
    }

    /**
     * 取得單一警報
     */
    getAlert(id: string): WeatherAlert | undefined {
        return this.alerts.get(id);
    }

    /**
     * 更新警報
     */
    updateAlert(id: string, updates: Partial<WeatherAlert>): WeatherAlert | null {
        const alert = this.alerts.get(id);
        if (!alert) return null;

        const updated = { ...alert, ...updates };
        this.alerts.set(id, updated);
        
        return updated;
    }

    /**
     * 解除警報
     */
    resolveAlert(id: string): boolean {
        const alert = this.alerts.get(id);
        if (!alert) return false;

        alert.isActive = false;
        alert.endTime = new Date();
        
        this.eventEmitter.emit('weather.alert.resolved', { alertId: id });
        
        return true;
    }

    // === Subscription Management ===

    /**
     * 訂閱警報
     */
    subscribe(data: Omit<AlertSubscription, 'id'>): AlertSubscription {
        const subscription: AlertSubscription = {
            ...data,
            id: `sub-${Date.now()}`,
        };

        this.subscriptions.set(subscription.id, subscription);
        return subscription;
    }

    /**
     * 取得用戶訂閱
     */
    getUserSubscriptions(userId: string): AlertSubscription[] {
        return Array.from(this.subscriptions.values())
            .filter(s => s.userId === userId);
    }

    /**
     * 更新訂閱
     */
    updateSubscription(id: string, updates: Partial<AlertSubscription>): AlertSubscription | null {
        const sub = this.subscriptions.get(id);
        if (!sub) return null;

        const updated = { ...sub, ...updates };
        this.subscriptions.set(id, updated);
        return updated;
    }

    /**
     * 取消訂閱
     */
    unsubscribe(id: string): boolean {
        return this.subscriptions.delete(id);
    }

    // === Mission Weather Link ===

    /**
     * 連結任務與警報
     */
    linkMission(data: MissionWeatherLink): MissionWeatherLink {
        this.missionLinks.set(data.missionId, data);
        return data;
    }

    /**
     * 取得任務天氣連結
     */
    getMissionLink(missionId: string): MissionWeatherLink | undefined {
        return this.missionLinks.get(missionId);
    }

    /**
     * 評估任務天氣影響
     */
    evaluateMissionImpact(missionId: string): { shouldProceed: boolean; warnings: string[] } {
        const link = this.missionLinks.get(missionId);
        const warnings: string[] = [];
        let shouldProceed = true;

        if (link) {
            const alert = this.alerts.get(link.alertId);
            if (alert?.isActive) {
                warnings.push(`活動警報: ${alert.title}`);
                
                if (alert.severity === 'emergency' || alert.severity === 'warning') {
                    shouldProceed = false;
                }
            }
        }

        // 檢查區域性警報
        const activeAlerts = this.getActiveAlerts();
        for (const alert of activeAlerts) {
            if (alert.severity === 'emergency') {
                warnings.push(`區域緊急警報: ${alert.title}`);
                shouldProceed = false;
            }
        }

        return { shouldProceed, warnings };
    }

    /**
     * 取消連結
     */
    unlinkMission(missionId: string): boolean {
        return this.missionLinks.delete(missionId);
    }

    // === Private Helpers ===

    private parseAlertFromCwa(info: Record<string, unknown>): WeatherAlert | null {
        if (!info) return null;

        const now = new Date();
        const validTime = info.validTime as Record<string, unknown> | undefined;
        
        return {
            id: `cwa-${(info.datasetId as string) || Date.now()}`,
            type: this.mapAlertType(info.datasetDescription as string),
            severity: this.mapSeverity(info.datasetSignificance as string),
            title: (info.datasetDescription as string) || '氣象警報',
            description: (info.datasetDescription as string) || '',
            affectedAreas: ['全臺'],
            startTime: new Date((validTime?.start as string) || now),
            endTime: validTime?.end ? new Date(validTime.end as string) : undefined,
            source: 'cwb',
            isActive: true,
            createdAt: now,
        };
    }

    private mapAlertType(description: string = ''): WeatherAlert['type'] {
        if (description.includes('颱風')) return 'typhoon';
        if (description.includes('豪雨') || description.includes('大雨')) return 'heavy_rain';
        if (description.includes('強風')) return 'strong_wind';
        if (description.includes('地震')) return 'earthquake';
        if (description.includes('海嘯')) return 'tsunami';
        if (description.includes('土石流')) return 'landslide';
        if (description.includes('淹水')) return 'flood';
        return 'other';
    }

    private mapSeverity(significance: string = ''): WeatherAlert['severity'] {
        if (significance.includes('特報')) return 'emergency';
        if (significance.includes('警報')) return 'warning';
        if (significance.includes('注意')) return 'watch';
        return 'advisory';
    }

    private triggerAlertNotifications(alert: WeatherAlert): void {
        // 找出符合的訂閱
        const matchedSubs = Array.from(this.subscriptions.values()).filter(sub => {
            if (!sub.enabled) return false;
            if (!sub.alertTypes.includes(alert.type)) return false;
            return sub.regions.some(r => alert.affectedAreas.some(a => a.includes(r)));
        });

        // 發出通知事件
        for (const sub of matchedSubs) {
            this.eventEmitter.emit('weather.alert.notify', {
                alertId: alert.id,
                userId: sub.userId,
                channels: sub.channels,
            });
        }

        this.logger.log(`Alert ${alert.id} triggered ${matchedSubs.length} notifications`);
    }

    private initSampleAlerts(): void {
        // 初始化範例警報（用於展示）
        this.alerts.set('sample-1', {
            id: 'sample-1',
            type: 'heavy_rain',
            severity: 'watch',
            title: '大雨特報',
            description: '北部地區午後有局部大雨發生的機率',
            affectedAreas: ['臺北市', '新北市', '基隆市'],
            startTime: new Date(),
            source: 'cwb',
            isActive: false, // 預設關閉
            createdAt: new Date(),
        });
    }
}
