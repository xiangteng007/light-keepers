import { Injectable, Logger } from '@nestjs/common';

export interface WeatherAlert {
    id: string;
    type: 'typhoon' | 'flood' | 'earthquake' | 'landslide' | 'tsunami' | 'heavy_rain' | 'strong_wind';
    severity: 'watch' | 'warning' | 'emergency';
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

export interface WeatherData {
    locationId: string;
    locationName: string;
    temperature: number;
    humidity: number;
    rainfall: number;
    windSpeed: number;
    windDirection: string;
    pressure: number;
    uvIndex: number;
    timestamp: Date;
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

@Injectable()
export class WeatherAlertIntegrationService {
    private readonly logger = new Logger(WeatherAlertIntegrationService.name);
    private alerts: Map<string, WeatherAlert> = new Map();
    private weatherData: Map<string, WeatherData[]> = new Map();
    private subscriptions: Map<string, AlertSubscription> = new Map();
    private missionLinks: Map<string, MissionWeatherLink> = new Map();

    // ===== 天氣警報管理 =====

    createAlert(data: Omit<WeatherAlert, 'id' | 'createdAt'>): WeatherAlert {
        const alert: WeatherAlert = {
            ...data,
            id: `wa-${Date.now()}`,
            createdAt: new Date(),
        };
        this.alerts.set(alert.id, alert);
        this.logger.warn(`Weather alert created: ${alert.type} - ${alert.severity}`);
        this.triggerAlertNotifications(alert);
        return alert;
    }

    getActiveAlerts(): WeatherAlert[] {
        return Array.from(this.alerts.values()).filter(a => a.isActive);
    }

    getAlertsByRegion(region: string): WeatherAlert[] {
        return Array.from(this.alerts.values())
            .filter(a => a.isActive && a.affectedAreas.includes(region));
    }

    getAlert(id: string): WeatherAlert | undefined {
        return this.alerts.get(id);
    }

    updateAlert(id: string, updates: Partial<WeatherAlert>): WeatherAlert | null {
        const alert = this.alerts.get(id);
        if (!alert) return null;
        Object.assign(alert, updates);
        if (updates.isActive === false) {
            this.logger.log(`Weather alert resolved: ${id}`);
        }
        return alert;
    }

    resolveAlert(id: string): boolean {
        const alert = this.alerts.get(id);
        if (!alert) return false;
        alert.isActive = false;
        alert.endTime = new Date();
        return true;
    }

    // ===== 氣象資料同步 (CWB API 整合) =====

    async syncFromCwb(): Promise<number> {
        // 模擬從中央氣象署 API 取得資料
        this.logger.log('Syncing weather data from CWB...');

        const mockLocations = ['台北市', '新北市', '桃園市', '台中市', '高雄市'];
        let synced = 0;

        for (const location of mockLocations) {
            const data: WeatherData = {
                locationId: `loc-${location}`,
                locationName: location,
                temperature: 20 + Math.random() * 15,
                humidity: 50 + Math.random() * 40,
                rainfall: Math.random() * 50,
                windSpeed: Math.random() * 30,
                windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
                pressure: 1000 + Math.random() * 30,
                uvIndex: Math.floor(Math.random() * 11),
                timestamp: new Date(),
            };

            const history = this.weatherData.get(location) || [];
            history.push(data);
            if (history.length > 1000) history.shift();
            this.weatherData.set(location, history);
            synced++;
        }

        this.checkWeatherThresholds();
        return synced;
    }

    getWeatherData(locationId: string): WeatherData | undefined {
        const history = this.weatherData.get(locationId);
        return history?.[history.length - 1];
    }

    getWeatherHistory(locationId: string, hours: number = 24): WeatherData[] {
        const history = this.weatherData.get(locationId) || [];
        const cutoff = new Date(Date.now() - hours * 3600000);
        return history.filter(d => d.timestamp >= cutoff);
    }

    private checkWeatherThresholds(): void {
        this.weatherData.forEach((history, location) => {
            const latest = history[history.length - 1];
            if (!latest) return;

            // 自動生成警報
            if (latest.rainfall > 40) {
                this.createAlert({
                    type: 'heavy_rain',
                    severity: latest.rainfall > 80 ? 'emergency' : 'warning',
                    title: `${location}大雨特報`,
                    description: `累積雨量已達 ${latest.rainfall.toFixed(1)} mm`,
                    affectedAreas: [location],
                    startTime: new Date(),
                    source: 'cwb',
                    isActive: true,
                });
            }

            if (latest.windSpeed > 20) {
                this.createAlert({
                    type: 'strong_wind',
                    severity: latest.windSpeed > 35 ? 'emergency' : 'warning',
                    title: `${location}強風特報`,
                    description: `風速達 ${latest.windSpeed.toFixed(1)} m/s`,
                    affectedAreas: [location],
                    startTime: new Date(),
                    source: 'cwb',
                    isActive: true,
                });
            }
        });
    }

    // ===== 訂閱管理 =====

    subscribe(data: Omit<AlertSubscription, 'id'>): AlertSubscription {
        const sub: AlertSubscription = { ...data, id: `sub-${Date.now()}` };
        this.subscriptions.set(sub.id, sub);
        return sub;
    }

    getUserSubscriptions(userId: string): AlertSubscription[] {
        return Array.from(this.subscriptions.values()).filter(s => s.userId === userId);
    }

    updateSubscription(id: string, updates: Partial<AlertSubscription>): AlertSubscription | null {
        const sub = this.subscriptions.get(id);
        if (!sub) return null;
        Object.assign(sub, updates);
        return sub;
    }

    unsubscribe(id: string): boolean {
        return this.subscriptions.delete(id);
    }

    private triggerAlertNotifications(alert: WeatherAlert): void {
        const subscribers = Array.from(this.subscriptions.values())
            .filter(s => s.enabled && s.alertTypes.includes(alert.type) &&
                s.regions.some(r => alert.affectedAreas.includes(r)));

        this.logger.log(`Notifying ${subscribers.length} subscribers about alert: ${alert.id}`);
        // TODO: 實際發送通知
    }

    // ===== 任務天氣連動 =====

    linkMissionToWeather(data: MissionWeatherLink): MissionWeatherLink {
        this.missionLinks.set(data.missionId, data);
        return data;
    }

    getMissionWeatherLink(missionId: string): MissionWeatherLink | undefined {
        return this.missionLinks.get(missionId);
    }

    evaluateMissionImpact(missionId: string): { shouldProceed: boolean; warnings: string[] } {
        const link = this.missionLinks.get(missionId);
        if (!link) return { shouldProceed: true, warnings: [] };

        const alert = this.alerts.get(link.alertId);
        if (!alert || !alert.isActive) return { shouldProceed: true, warnings: [] };

        const warnings: string[] = [];
        warnings.push(`活躍警報: ${alert.title}`);

        if (alert.severity === 'emergency') {
            return { shouldProceed: false, warnings };
        }

        return { shouldProceed: true, warnings };
    }

    unlinkMission(missionId: string): boolean {
        return this.missionLinks.delete(missionId);
    }
}
