import { Injectable, Logger } from '@nestjs/common';
import { CurrentWeatherService, CurrentWeatherData } from './services/current-weather.service';
import { ForecastService, WeatherForecast, WeeklyForecast } from './services/forecast.service';
import { AlertService, WeatherAlert, AlertSubscription } from './services/alert.service';
import { WeatherRiskService, WeatherRiskAssessment } from './services/weather-risk.service';

export interface WeatherOverview {
    current: CurrentWeatherData[];
    forecast: WeatherForecast[];
    alerts: WeatherAlert[];
    lastUpdated: Date;
}

/**
 * Weather Service (Unified Facade)
 * 
 * 統一的氣象服務入口，整合：
 * - 即時天氣
 * - 預報
 * - 警報
 * - 風險評估
 * 
 * 取代舊模組：weather, weather-forecast, weather-hub, weather-alert-integration
 */
@Injectable()
export class WeatherService {
    private readonly logger = new Logger(WeatherService.name);

    constructor(
        private readonly currentWeather: CurrentWeatherService,
        private readonly forecast: ForecastService,
        private readonly alerts: AlertService,
        private readonly risk: WeatherRiskService,
    ) {}

    // === 快速存取方法 ===

    /**
     * 取得天氣概覽
     */
    async getOverview(location?: string): Promise<WeatherOverview> {
        const [current, forecast, alerts] = await Promise.all([
            this.getCurrentWeather(location),
            this.getForecast(location),
            this.getActiveAlerts(),
        ]);

        return {
            current,
            forecast,
            alerts,
            lastUpdated: new Date(),
        };
    }

    /**
     * 取得位置完整天氣資訊
     */
    async getWeatherByLocation(lat: number, lng: number): Promise<{
        current: CurrentWeatherData | null;
        forecast: unknown;
        risk: WeatherRiskAssessment;
        alerts: WeatherAlert[];
    }> {
        const [currentData, forecastData, riskData] = await Promise.all([
            Promise.resolve(this.currentWeather.getNearestStation(lat, lng)),
            this.forecast.getForecastSummary(),
            this.risk.assessRisk(lat, lng),
        ]);

        return {
            current: currentData,
            forecast: forecastData,
            risk: riskData,
            alerts: this.alerts.getActiveAlerts(),
        };
    }

    // === 即時天氣 ===

    getCurrentWeather(location?: string): CurrentWeatherData[] {
        if (location) {
            return this.currentWeather.getByLocation(location);
        }
        return this.currentWeather.getAll();
    }

    getWeatherByCode(code: string): CurrentWeatherData | undefined {
        return this.currentWeather.getByCode(code);
    }

    // === 預報 ===

    async getForecast(location?: string): Promise<WeatherForecast[]> {
        return this.forecast.getGeneralForecast(location);
    }

    async getWeeklyForecast(location?: string): Promise<WeeklyForecast[]> {
        return this.forecast.getWeeklyForecast(location);
    }

    async getMarineForecast(region?: string) {
        return this.forecast.getMarineForecast(region);
    }

    async getTideForecast(stationName?: string) {
        return this.forecast.getTideForecast(stationName);
    }

    async getMountainForecast(locationName?: string) {
        return this.forecast.getMountainForecast(locationName);
    }

    // === 警報 ===

    getActiveAlerts(): WeatherAlert[] {
        return this.alerts.getActiveAlerts();
    }

    getAlertsByRegion(region: string): WeatherAlert[] {
        return this.alerts.getAlertsByRegion(region);
    }

    getAlert(id: string): WeatherAlert | undefined {
        return this.alerts.getAlert(id);
    }

    createAlert(data: Omit<WeatherAlert, 'id' | 'createdAt'>): WeatherAlert {
        return this.alerts.createAlert(data);
    }

    resolveAlert(id: string): boolean {
        return this.alerts.resolveAlert(id);
    }

    async syncAlertsFromCwa(): Promise<number> {
        return this.alerts.syncFromCwa();
    }

    // === 警報訂閱 ===

    subscribeToAlerts(data: Omit<AlertSubscription, 'id'>): AlertSubscription {
        return this.alerts.subscribe(data);
    }

    getUserAlertSubscriptions(userId: string): AlertSubscription[] {
        return this.alerts.getUserSubscriptions(userId);
    }

    unsubscribeFromAlerts(id: string): boolean {
        return this.alerts.unsubscribe(id);
    }

    // === 風險評估 ===

    async assessWeatherRisk(lat: number, lng: number): Promise<WeatherRiskAssessment> {
        return this.risk.assessRisk(lat, lng);
    }

    async assessMissionFeasibility(missionId: string, locations: Array<{ lat: number; lng: number }>) {
        return this.risk.assessMissionFeasibility(missionId, locations);
    }

    hasSevereWeather(): boolean {
        return this.risk.hasSevereWeather();
    }

    // === 任務連結 ===

    linkMissionToWeather(missionId: string, alertId: string, actions: ('notify_team' | 'suspend_outdoor' | 'evacuate' | 'standby')[]) {
        return this.alerts.linkMission({
            missionId,
            alertId,
            autoTrigger: true,
            actions: actions,
        });
    }

    evaluateMissionWeatherImpact(missionId: string) {
        return this.alerts.evaluateMissionImpact(missionId);
    }

    unlinkMission(missionId: string): boolean {
        return this.alerts.unlinkMission(missionId);
    }

    // === 同步 ===

    async syncWeatherData(): Promise<void> {
        await this.currentWeather.syncWeatherData();
    }
}
