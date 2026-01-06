import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Trend Prediction Service
 * Predict disaster occurrence probability based on historical data
 */
@Injectable()
export class TrendPredictionService {
    private readonly logger = new Logger(TrendPredictionService.name);

    constructor(private configService: ConfigService) { }

    /**
     * 預測災害發生機率
     */
    async predictDisasterProbability(region: string, disasterType: string, days: number = 7): Promise<PredictionResult> {
        // 基於歷史資料和當前條件計算
        const historicalData = await this.getHistoricalData(region, disasterType);
        const currentConditions = await this.getCurrentConditions(region);

        const probability = this.calculateProbability(historicalData, currentConditions, disasterType);

        return {
            region,
            disasterType,
            period: `${days} 天內`,
            probability,
            riskLevel: this.getRiskLevel(probability),
            confidence: 0.75, // 模型信心度
            factors: this.identifyRiskFactors(currentConditions, disasterType),
            recommendations: this.generatePrecautions(probability, disasterType),
            generatedAt: new Date(),
        };
    }

    /**
     * 取得區域風險概覽
     */
    async getRegionRiskOverview(region: string): Promise<RegionRiskOverview> {
        const disasterTypes = ['earthquake', 'flood', 'landslide', 'typhoon', 'fire'];
        const risks: DisasterRisk[] = [];

        for (const type of disasterTypes) {
            const prediction = await this.predictDisasterProbability(region, type, 30);
            risks.push({
                type,
                typeName: this.getDisasterTypeName(type),
                probability: prediction.probability,
                riskLevel: prediction.riskLevel,
            });
        }

        return {
            region,
            overallRisk: this.calculateOverallRisk(risks),
            risks: risks.sort((a, b) => b.probability - a.probability),
            updatedAt: new Date(),
        };
    }

    /**
     * 取得季節性趨勢
     */
    getSeasonalTrends(region: string): SeasonalTrend[] {
        // 台灣季節性災害模式
        return [
            { month: 1, primaryRisk: 'earthquake', secondaryRisk: 'cold_wave', riskScore: 40 },
            { month: 2, primaryRisk: 'earthquake', secondaryRisk: null, riskScore: 35 },
            { month: 3, primaryRisk: 'earthquake', secondaryRisk: 'fog', riskScore: 35 },
            { month: 4, primaryRisk: 'flood', secondaryRisk: 'earthquake', riskScore: 50 },
            { month: 5, primaryRisk: 'flood', secondaryRisk: 'landslide', riskScore: 65 },
            { month: 6, primaryRisk: 'flood', secondaryRisk: 'landslide', riskScore: 75 },
            { month: 7, primaryRisk: 'typhoon', secondaryRisk: 'flood', riskScore: 85 },
            { month: 8, primaryRisk: 'typhoon', secondaryRisk: 'flood', riskScore: 90 },
            { month: 9, primaryRisk: 'typhoon', secondaryRisk: 'flood', riskScore: 80 },
            { month: 10, primaryRisk: 'typhoon', secondaryRisk: 'earthquake', riskScore: 55 },
            { month: 11, primaryRisk: 'earthquake', secondaryRisk: 'cold_wave', riskScore: 40 },
            { month: 12, primaryRisk: 'cold_wave', secondaryRisk: 'earthquake', riskScore: 45 },
        ];
    }

    /**
     * 資源需求預測
     */
    async predictResourceDemand(region: string, scenario: string): Promise<ResourceDemandForecast> {
        const scenarios: Record<string, ResourceDemandForecast> = {
            typhoon_medium: {
                scenario: '中度颱風',
                estimatedAffected: 5000,
                shelterCapacity: 1000,
                waterLiters: 15000,
                foodMeals: 6000,
                medicalKits: 100,
                blankets: 500,
                generators: 10,
                volunteers: 200,
            },
            earthquake_6: {
                scenario: '規模6地震',
                estimatedAffected: 20000,
                shelterCapacity: 5000,
                waterLiters: 60000,
                foodMeals: 30000,
                medicalKits: 500,
                blankets: 2000,
                generators: 50,
                volunteers: 1000,
            },
            flood_major: {
                scenario: '大規模洪水',
                estimatedAffected: 10000,
                shelterCapacity: 3000,
                waterLiters: 30000,
                foodMeals: 15000,
                medicalKits: 200,
                blankets: 1000,
                generators: 30,
                volunteers: 500,
            },
        };

        return scenarios[scenario] || scenarios.typhoon_medium;
    }

    // Private methods
    private async getHistoricalData(region: string, type: string): Promise<HistoricalEvent[]> {
        // 模擬歷史資料 - 實際應從資料庫取得
        return [];
    }

    private async getCurrentConditions(region: string): Promise<CurrentConditions> {
        // 模擬當前條件 - 實際應整合氣象 API
        return {
            rainfall: 0,
            temperature: 25,
            humidity: 70,
            windSpeed: 5,
            soilMoisture: 50,
            reservoirLevel: 70,
            seismicActivity: 'low',
        };
    }

    private calculateProbability(historical: HistoricalEvent[], conditions: CurrentConditions, type: string): number {
        // 簡化的機率計算
        let baseProbability = 10;

        if (type === 'flood') {
            baseProbability += conditions.rainfall * 0.5;
            baseProbability += (100 - conditions.reservoirLevel) * 0.1;
        } else if (type === 'landslide') {
            baseProbability += conditions.rainfall * 0.3;
            baseProbability += conditions.soilMoisture * 0.2;
        } else if (type === 'earthquake') {
            baseProbability = conditions.seismicActivity === 'high' ? 30 : 15;
        }

        return Math.min(Math.max(baseProbability, 0), 100);
    }

    private getRiskLevel(probability: number): string {
        if (probability >= 70) return 'critical';
        if (probability >= 50) return 'high';
        if (probability >= 30) return 'moderate';
        return 'low';
    }

    private identifyRiskFactors(conditions: CurrentConditions, type: string): string[] {
        const factors: string[] = [];
        if (conditions.rainfall > 50) factors.push('高降雨量');
        if (conditions.soilMoisture > 80) factors.push('土壤飽和');
        if (conditions.seismicActivity === 'high') factors.push('地震活動頻繁');
        return factors;
    }

    private generatePrecautions(probability: number, type: string): string[] {
        const precautions: string[] = [];
        if (probability > 50) {
            precautions.push('加強巡邏與監測');
            precautions.push('預先準備物資');
            precautions.push('發布預警通知');
        }
        return precautions;
    }

    private getDisasterTypeName(type: string): string {
        const names: Record<string, string> = {
            earthquake: '地震', flood: '洪水', landslide: '土石流',
            typhoon: '颱風', fire: '火災', cold_wave: '寒流',
        };
        return names[type] || type;
    }

    private calculateOverallRisk(risks: DisasterRisk[]): string {
        const maxProb = Math.max(...risks.map((r) => r.probability));
        return this.getRiskLevel(maxProb);
    }
}

// Types
interface HistoricalEvent { date: Date; type: string; severity: number; }
interface CurrentConditions {
    rainfall: number; temperature: number; humidity: number;
    windSpeed: number; soilMoisture: number; reservoirLevel: number;
    seismicActivity: string;
}
interface PredictionResult {
    region: string; disasterType: string; period: string;
    probability: number; riskLevel: string; confidence: number;
    factors: string[]; recommendations: string[]; generatedAt: Date;
}
interface DisasterRisk { type: string; typeName: string; probability: number; riskLevel: string; }
interface RegionRiskOverview { region: string; overallRisk: string; risks: DisasterRisk[]; updatedAt: Date; }
interface SeasonalTrend { month: number; primaryRisk: string; secondaryRisk: string | null; riskScore: number; }
interface ResourceDemandForecast {
    scenario: string; estimatedAffected: number; shelterCapacity: number;
    waterLiters: number; foodMeals: number; medicalKits: number;
    blankets: number; generators: number; volunteers: number;
}
