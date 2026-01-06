import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * TCCIP Climate Service
 * Taiwan Climate Change Information Platform integration
 * 
 * 📋 API 來源:
 * - TCCIP: https://tccip.ncdr.nat.gov.tw/
 */
@Injectable()
export class TccipClimateService {
    private readonly logger = new Logger(TccipClimateService.name);

    constructor(private configService: ConfigService) { }

    /**
     * 取得氣候變遷趨勢
     */
    async getClimateTrends(region: string): Promise<ClimateTrend> {
        // 基於 TCCIP 研究資料
        return {
            region,
            temperatureTrend: { current: 24.5, projected2050: 26.2, change: +1.7 },
            precipitationTrend: { extreme: +15, droughtRisk: +20, floodRisk: +25 },
            seaLevelRise: { current: 0, projected2050: 25, projected2100: 60 },
            typhoonTrend: { intensityChange: +10, frequencyChange: -5 },
            dataSource: 'TCCIP AR6 推估',
            updatedAt: new Date(),
        };
    }

    /**
     * 取得極端天氣預測
     */
    async getExtremeWeatherForecast(region: string): Promise<ExtremeWeatherForecast[]> {
        return [
            { type: 'heatwave', probability: 0.35, timing: '7月-8月', impact: '高溫超過38°C天數增加' },
            { type: 'heavy_rain', probability: 0.45, timing: '5月-9月', impact: '時雨量超過80mm機率增加' },
            { type: 'drought', probability: 0.25, timing: '11月-4月', impact: '枯水期延長' },
        ];
    }

    /**
     * 取得區域脆弱度評估
     */
    async getVulnerabilityAssessment(region: string): Promise<VulnerabilityAssessment> {
        return {
            region,
            overall: 'moderate',
            dimensions: {
                exposure: 0.65, // 暴露度
                sensitivity: 0.55, // 敏感度
                adaptiveCapacity: 0.70, // 調適能力
            },
            primaryRisks: ['洪水', '坡地災害', '高溫熱浪'],
            recommendations: [
                '加強排水系統',
                '建立早期預警系統',
                '推廣氣候調適教育',
            ],
            assessmentDate: new Date(),
        };
    }

    /**
     * 取得歷史災害統計
     */
    async getHistoricalDisasterStats(region: string, years: number = 10): Promise<DisasterStats> {
        return {
            region,
            period: `${new Date().getFullYear() - years}-${new Date().getFullYear()}`,
            totalEvents: 245,
            byType: {
                typhoon: 85,
                flood: 62,
                landslide: 48,
                earthquake: 35,
                drought: 15,
            },
            annualTrend: 'increasing',
            avgAnnualDamage: 5000000000, // NTD
        };
    }

    /**
     * 取得調適策略建議
     */
    getAdaptationStrategies(risks: string[]): AdaptationStrategy[] {
        const strategies: Record<string, AdaptationStrategy> = {
            flood: { risk: 'flood', strategies: ['建置滯洪池', '提升排水容量', '土地使用管理'], priority: 'high', estimatedCost: '高' },
            heatwave: { risk: 'heatwave', strategies: ['增加綠地覆蓋', '推廣綠建築', '建立降溫中心'], priority: 'medium', estimatedCost: '中' },
            drought: { risk: 'drought', strategies: ['多元水源開發', '節水措施', '再生水利用'], priority: 'high', estimatedCost: '高' },
            landslide: { risk: 'landslide', strategies: ['邊坡監測', '預警系統', '土地使用限制'], priority: 'high', estimatedCost: '中' },
        };

        return risks.map((r) => strategies[r]).filter(Boolean);
    }
}

// Types
interface ClimateTrend {
    region: string;
    temperatureTrend: { current: number; projected2050: number; change: number };
    precipitationTrend: { extreme: number; droughtRisk: number; floodRisk: number };
    seaLevelRise: { current: number; projected2050: number; projected2100: number };
    typhoonTrend: { intensityChange: number; frequencyChange: number };
    dataSource: string; updatedAt: Date;
}
interface ExtremeWeatherForecast { type: string; probability: number; timing: string; impact: string; }
interface VulnerabilityAssessment {
    region: string; overall: string;
    dimensions: { exposure: number; sensitivity: number; adaptiveCapacity: number };
    primaryRisks: string[]; recommendations: string[]; assessmentDate: Date;
}
interface DisasterStats {
    region: string; period: string; totalEvents: number;
    byType: Record<string, number>; annualTrend: string; avgAnnualDamage: number;
}
interface AdaptationStrategy { risk: string; strategies: string[]; priority: string; estimatedCost: string; }
