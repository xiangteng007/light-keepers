import { Injectable, Logger } from '@nestjs/common';
import { CurrentWeatherService, CurrentWeatherData } from './current-weather.service';
import { AlertService, WeatherAlert } from './alert.service';

export interface WeatherRiskAssessment {
    location: { lat: number; lng: number; name?: string };
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    score: number; // 0-100
    factors: WeatherRiskFactor[];
    recommendations: string[];
    activeAlerts: string[];
    assessedAt: Date;
}

export interface WeatherRiskFactor {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    value?: number | string;
}

/**
 * 天氣風險評估服務
 * 
 * 整合天氣資料與警報，提供：
 * - 位置風險評估
 * - 任務可行性分析
 * - 緊急行動建議
 */
@Injectable()
export class WeatherRiskService {
    private readonly logger = new Logger(WeatherRiskService.name);

    constructor(
        private readonly currentWeather: CurrentWeatherService,
        private readonly alertService: AlertService,
    ) {}

    /**
     * 評估位置天氣風險
     */
    async assessRisk(lat: number, lng: number): Promise<WeatherRiskAssessment> {
        const weather = this.currentWeather.getNearestStation(lat, lng);
        const alerts = this.alertService.getActiveAlerts();
        const factors: WeatherRiskFactor[] = [];
        let score = 0;

        // 評估降雨風險
        if (weather) {
            if (weather.rainfall > 50) {
                factors.push({
                    type: 'rainfall',
                    severity: 'high',
                    description: '豪大雨',
                    value: `${weather.rainfall}mm`,
                });
                score += 40;
            } else if (weather.rainfall > 15) {
                factors.push({
                    type: 'rainfall',
                    severity: 'medium',
                    description: '中雨',
                    value: `${weather.rainfall}mm`,
                });
                score += 20;
            }

            // 評估風速風險
            if (weather.windSpeed > 17) {
                factors.push({
                    type: 'wind',
                    severity: 'high',
                    description: '強風',
                    value: `${weather.windSpeed}m/s`,
                });
                score += 30;
            } else if (weather.windSpeed > 10) {
                factors.push({
                    type: 'wind',
                    severity: 'medium',
                    description: '風速偏大',
                    value: `${weather.windSpeed}m/s`,
                });
                score += 15;
            }

            // 評估能見度（由濕度推估）
            if (weather.humidity > 95) {
                factors.push({
                    type: 'visibility',
                    severity: 'medium',
                    description: '能見度不佳',
                    value: `濕度 ${weather.humidity}%`,
                });
                score += 10;
            }
        }

        // 評估警報風險
        for (const alert of alerts) {
            if (alert.severity === 'emergency') {
                factors.push({
                    type: 'alert',
                    severity: 'high',
                    description: alert.title,
                });
                score += 50;
            } else if (alert.severity === 'warning') {
                factors.push({
                    type: 'alert',
                    severity: 'high',
                    description: alert.title,
                });
                score += 30;
            } else if (alert.severity === 'watch') {
                factors.push({
                    type: 'alert',
                    severity: 'medium',
                    description: alert.title,
                });
                score += 15;
            }
        }

        // 正規化分數
        score = Math.min(score, 100);
        const riskLevel = this.scoreToLevel(score);
        const recommendations = this.generateRecommendations(riskLevel, factors);

        return {
            location: { lat, lng, name: weather?.locationName },
            riskLevel,
            score,
            factors,
            recommendations,
            activeAlerts: alerts.map(a => a.title),
            assessedAt: new Date(),
        };
    }

    /**
     * 評估任務執行可行性
     */
    async assessMissionFeasibility(
        missionId: string,
        locations: Array<{ lat: number; lng: number }>
    ): Promise<{
        feasible: boolean;
        overallRisk: 'low' | 'medium' | 'high' | 'critical';
        locationRisks: WeatherRiskAssessment[];
        recommendations: string[];
    }> {
        const assessments = await Promise.all(
            locations.map(loc => this.assessRisk(loc.lat, loc.lng))
        );

        const maxScore = Math.max(...assessments.map(a => a.score));
        const overallRisk = this.scoreToLevel(maxScore);
        
        const feasible = overallRisk !== 'critical' && 
                         assessments.every(a => a.riskLevel !== 'critical');

        const allRecommendations = new Set<string>();
        for (const a of assessments) {
            a.recommendations.forEach(r => allRecommendations.add(r));
        }

        return {
            feasible,
            overallRisk,
            locationRisks: assessments,
            recommendations: Array.from(allRecommendations),
        };
    }

    /**
     * 快速檢查是否有嚴重天氣
     */
    hasSevereWeather(): boolean {
        const alerts = this.alertService.getActiveAlerts();
        return alerts.some(a => 
            a.severity === 'emergency' || a.severity === 'warning'
        );
    }

    /**
     * 取得行動建議
     */
    getActionRecommendations(riskLevel: string): string[] {
        switch (riskLevel) {
            case 'critical':
                return [
                    '立即停止所有戶外活動',
                    '尋找安全掩蔽處',
                    '通知所有人員撤離危險區域',
                    '啟動緊急應變程序',
                ];
            case 'high':
                return [
                    '停止非必要戶外活動',
                    '準備緊急撤離',
                    '密切注意天氣變化',
                    '確保通訊暢通',
                ];
            case 'medium':
                return [
                    '縮短戶外活動時間',
                    '準備雨具和防護裝備',
                    '隨時注意天氣預報',
                ];
            default:
                return [
                    '正常進行活動',
                    '注意天氣變化',
                ];
        }
    }

    // === Private Helpers ===

    private scoreToLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
        if (score >= 70) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 25) return 'medium';
        return 'low';
    }

    private generateRecommendations(
        level: string,
        factors: WeatherRiskFactor[]
    ): string[] {
        const recommendations = this.getActionRecommendations(level);
        
        // 根據具體因素添加建議
        if (factors.some(f => f.type === 'rainfall' && f.severity === 'high')) {
            recommendations.push('避開低窪地區');
            recommendations.push('注意土石流警戒');
        }
        
        if (factors.some(f => f.type === 'wind' && f.severity === 'high')) {
            recommendations.push('固定戶外物品');
            recommendations.push('避免高處作業');
        }

        return recommendations;
    }
}
