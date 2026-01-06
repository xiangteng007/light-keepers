/**
 * AI Prediction Service - AI 消耗率預測
 * 長期擴展功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============ Types ============

export interface ResourceConsumption {
    resourceId: string;
    resourceName: string;
    category: string;
    currentStock: number;
    unit: string;
    consumptionHistory: { timestamp: Date; quantity: number }[];
}

export interface BurnRatePrediction {
    resourceId: string;
    resourceName: string;
    currentStock: number;
    dailyBurnRate: number;
    daysUntilDepletion: number;
    recommendedReorder: number;
    confidence: number;
    factors: string[];
    predictedAt: Date;
}

export interface DemandForecast {
    missionSessionId: string;
    predictions: {
        category: string;
        items: {
            name: string;
            predictedDemand: number;
            confidence: number;
        }[];
    }[];
    createdAt: Date;
}

// ============ Service ============

@Injectable()
export class AiPredictionService {
    private readonly logger = new Logger(AiPredictionService.name);
    private readonly apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    }

    // ==================== Burn Rate Analysis ====================

    /**
     * 計算資源消耗率並預測耗盡時間
     */
    calculateBurnRate(consumption: ResourceConsumption): BurnRatePrediction {
        const history = consumption.consumptionHistory.slice(-30); // Last 30 records

        if (history.length < 3) {
            return {
                resourceId: consumption.resourceId,
                resourceName: consumption.resourceName,
                currentStock: consumption.currentStock,
                dailyBurnRate: 0,
                daysUntilDepletion: Infinity,
                recommendedReorder: 0,
                confidence: 0,
                factors: ['資料不足'],
                predictedAt: new Date(),
            };
        }

        // Calculate daily consumption
        const dailyConsumption: number[] = [];
        for (let i = 1; i < history.length; i++) {
            const daysDiff = this.daysBetween(history[i - 1].timestamp, history[i].timestamp);
            if (daysDiff > 0) {
                dailyConsumption.push(history[i].quantity / daysDiff);
            }
        }

        // Weighted moving average (recent data weighted more)
        let weightedSum = 0;
        let weightTotal = 0;
        for (let i = 0; i < dailyConsumption.length; i++) {
            const weight = i + 1; // More recent = higher weight
            weightedSum += dailyConsumption[i] * weight;
            weightTotal += weight;
        }

        const dailyBurnRate = weightTotal > 0 ? weightedSum / weightTotal : 0;
        const daysUntilDepletion = dailyBurnRate > 0
            ? Math.floor(consumption.currentStock / dailyBurnRate)
            : Infinity;

        // Confidence based on data consistency
        const variance = this.calculateVariance(dailyConsumption);
        const mean = dailyConsumption.reduce((a, b) => a + b, 0) / dailyConsumption.length;
        const cv = mean > 0 ? Math.sqrt(variance) / mean : 1; // Coefficient of variation
        const confidence = Math.max(0, Math.min(1, 1 - cv));

        // Recommend reorder if less than 7 days supply
        const recommendedReorder = daysUntilDepletion < 7
            ? Math.ceil(dailyBurnRate * 14) // 2 weeks supply
            : 0;

        const factors: string[] = [];
        if (daysUntilDepletion < 3) factors.push('緊急補給');
        if (cv > 0.5) factors.push('消耗不穩定');
        if (dailyConsumption.length < 7) factors.push('資料樣本小');

        return {
            resourceId: consumption.resourceId,
            resourceName: consumption.resourceName,
            currentStock: consumption.currentStock,
            dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
            daysUntilDepletion,
            recommendedReorder,
            confidence: Math.round(confidence * 100) / 100,
            factors,
            predictedAt: new Date(),
        };
    }

    // ==================== Demand Forecasting ====================

    /**
     * 使用 Gemini 預測任務需求
     */
    async forecastDemand(
        missionType: string,
        estimatedScale: number,
        duration: number,
        historicalData?: any[]
    ): Promise<DemandForecast> {
        const missionSessionId = `forecast-${Date.now()}`;

        if (!this.apiKey) {
            this.logger.warn('Gemini API key not configured, using default forecast');
            return this.defaultForecast(missionSessionId, missionType, estimatedScale);
        }

        try {
            const prompt = `作為災難應變資源規劃專家，根據以下任務參數預測所需資源：

任務類型: ${missionType}
預估規模 (受影響人數): ${estimatedScale}
預計持續時間: ${duration} 小時
${historicalData ? `歷史資料: ${JSON.stringify(historicalData.slice(0, 5))}` : ''}

請以 JSON 格式回覆預測需求：
{
    "predictions": [
        {
            "category": "類別名稱",
            "items": [
                {"name": "物資名稱", "predictedDemand": 數量, "confidence": 0-1}
            ]
        }
    ]
}

類別應包含: 醫療用品, 飲水食物, 通訊設備, 搜救裝備, 照明電力`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    missionSessionId,
                    predictions: parsed.predictions || [],
                    createdAt: new Date(),
                };
            }

            throw new Error('Could not parse Gemini response');
        } catch (error) {
            this.logger.error(`Demand forecast failed: ${error}`);
            return this.defaultForecast(missionSessionId, missionType, estimatedScale);
        }
    }

    private defaultForecast(missionSessionId: string, missionType: string, scale: number): DemandForecast {
        // Default predictions based on mission type
        const baseMultiplier = scale / 100;

        return {
            missionSessionId,
            predictions: [
                {
                    category: '醫療用品',
                    items: [
                        { name: '急救包', predictedDemand: Math.ceil(scale * 0.2), confidence: 0.7 },
                        { name: '繃帶', predictedDemand: Math.ceil(scale * 0.5), confidence: 0.8 },
                        { name: '擔架', predictedDemand: Math.ceil(scale * 0.05), confidence: 0.6 },
                    ],
                },
                {
                    category: '飲水食物',
                    items: [
                        { name: '飲用水 (公升)', predictedDemand: Math.ceil(scale * 3), confidence: 0.9 },
                        { name: '乾糧 (份)', predictedDemand: Math.ceil(scale * 2), confidence: 0.85 },
                    ],
                },
                {
                    category: '通訊設備',
                    items: [
                        { name: '無線電', predictedDemand: Math.ceil(baseMultiplier * 5), confidence: 0.75 },
                        { name: '行動電源', predictedDemand: Math.ceil(baseMultiplier * 10), confidence: 0.7 },
                    ],
                },
            ],
            createdAt: new Date(),
        };
    }

    // ==================== Helpers ====================

    private daysBetween(date1: Date, date2: Date): number {
        const d1 = new Date(date1).getTime();
        const d2 = new Date(date2).getTime();
        return Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
    }

    private calculateVariance(data: number[]): number {
        if (data.length === 0) return 0;
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        return data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    }
}
