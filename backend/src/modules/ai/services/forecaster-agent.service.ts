/**
 * Forecaster Agent Service
 * 
 * AI-powered resource demand prediction and gap analysis
 * v1.0: Supply prediction, demand forecasting, resource matching
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DemandForecast {
    resourceType: string;
    currentStock: number;
    predictedDemand: number;
    confidence: number;
    timeframe: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
}

export interface ResourceGap {
    resourceType: string;
    category: string;
    currentQuantity: number;
    minimumRequired: number;
    gap: number;
    severity: 'critical' | 'warning' | 'ok';
    suggestedAction: string;
    estimatedCost?: number;
}

export interface SupplyPrediction {
    scenarioName: string;
    duration: string;
    affectedArea: string;
    estimatedCasualties: number;
    resourcesNeeded: {
        type: string;
        quantity: number;
        priority: 'critical' | 'high' | 'medium' | 'low';
    }[];
    personnelNeeded: {
        role: string;
        count: number;
        skills: string[];
    }[];
}

@Injectable()
export class ForecasterAgentService {
    private readonly logger = new Logger(ForecasterAgentService.name);
    private readonly aiProvider: 'gemini' | 'openai' | 'mock';

    constructor(private readonly configService: ConfigService) {
        this.aiProvider = this.configService.get<'gemini' | 'openai' | 'mock'>('AI_PROVIDER', 'mock');
    }

    /**
     * Forecast resource demand based on historical data and current conditions
     */
    async forecastDemand(params: {
        resourceTypes: string[];
        currentInventory: Record<string, number>;
        historicalUsage: Record<string, number[]>;
        activeIncidents: number;
        weatherConditions?: string;
    }): Promise<DemandForecast[]> {
        this.logger.log('Generating resource demand forecast');

        return params.resourceTypes.map(resourceType => {
            const current = params.currentInventory[resourceType] || 0;
            const history = params.historicalUsage[resourceType] || [0];

            // Simple moving average prediction
            const avgUsage = history.reduce((a, b) => a + b, 0) / history.length;

            // Adjust for active incidents
            const incidentMultiplier = 1 + (params.activeIncidents * 0.1);
            const predictedDemand = Math.round(avgUsage * incidentMultiplier * 7); // 7-day forecast

            // Determine trend
            let trend: DemandForecast['trend'] = 'stable';
            if (history.length >= 2) {
                const recentAvg = history.slice(-3).reduce((a, b) => a + b, 0) / 3;
                const oldAvg = history.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
                if (recentAvg > oldAvg * 1.1) trend = 'increasing';
                else if (recentAvg < oldAvg * 0.9) trend = 'decreasing';
            }

            // Generate recommendation
            let recommendation = '庫存充足，維持現有補貨週期';
            if (current < predictedDemand * 0.5) {
                recommendation = '建議立即補貨，預計庫存不足應對未來需求';
            } else if (current < predictedDemand * 0.8) {
                recommendation = '建議提前補貨，以維持安全庫存水平';
            }

            return {
                resourceType,
                currentStock: current,
                predictedDemand,
                confidence: 0.75 + Math.random() * 0.2,
                timeframe: '未來 7 天',
                trend,
                recommendation,
            };
        });
    }

    /**
     * Analyze resource gaps and provide recommendations
     */
    async analyzeGaps(params: {
        inventory: { type: string; category: string; quantity: number; minimum: number }[];
    }): Promise<ResourceGap[]> {
        return params.inventory.map(item => {
            const gap = item.minimum - item.quantity;
            let severity: ResourceGap['severity'] = 'ok';
            let suggestedAction = '庫存充足';

            if (gap > item.minimum * 0.5) {
                severity = 'critical';
                suggestedAction = `緊急補貨 ${gap} 單位，避免物資短缺`;
            } else if (gap > 0) {
                severity = 'warning';
                suggestedAction = `建議補貨 ${gap} 單位`;
            }

            return {
                resourceType: item.type,
                category: item.category,
                currentQuantity: item.quantity,
                minimumRequired: item.minimum,
                gap: Math.max(0, gap),
                severity,
                suggestedAction,
                estimatedCost: gap > 0 ? gap * (Math.random() * 100 + 50) : undefined,
            };
        });
    }

    /**
     * Predict supply needs for disaster scenarios
     */
    async predictForScenario(params: {
        disasterType: 'earthquake' | 'flood' | 'typhoon' | 'fire' | 'other';
        magnitude: 'small' | 'medium' | 'large' | 'catastrophic';
        affectedPopulation: number;
        duration: number; // hours
        location: string;
    }): Promise<SupplyPrediction> {
        this.logger.log(`Predicting supplies for ${params.disasterType} scenario`);

        // Base multipliers by disaster type
        const disasterMultipliers: Record<string, number> = {
            earthquake: 1.5,
            flood: 1.2,
            typhoon: 1.3,
            fire: 1.0,
            other: 1.0,
        };

        // Magnitude multipliers
        const magnitudeMultipliers: Record<string, number> = {
            small: 0.3,
            medium: 0.6,
            large: 1.0,
            catastrophic: 2.0,
        };

        const baseMultiplier = disasterMultipliers[params.disasterType] * magnitudeMultipliers[params.magnitude];
        const estimatedCasualties = Math.round(params.affectedPopulation * 0.01 * baseMultiplier);

        // Calculate resource needs
        const resourcesNeeded = [
            { type: '飲用水 (瓶)', quantity: Math.round(params.affectedPopulation * 3 * baseMultiplier), priority: 'critical' as const },
            { type: '急救包', quantity: Math.round(estimatedCasualties * 1.5), priority: 'critical' as const },
            { type: '毛毯', quantity: Math.round(params.affectedPopulation * 0.3 * baseMultiplier), priority: 'high' as const },
            { type: '乾糧 (份)', quantity: Math.round(params.affectedPopulation * 2 * baseMultiplier), priority: 'high' as const },
            { type: '帳篷', quantity: Math.round(params.affectedPopulation * 0.1 * baseMultiplier), priority: 'medium' as const },
            { type: '發電機', quantity: Math.round(params.affectedPopulation * 0.001 * baseMultiplier) + 1, priority: 'medium' as const },
        ];

        // Calculate personnel needs
        const personnelNeeded = [
            { role: '急救人員', count: Math.round(estimatedCasualties * 0.2) + 2, skills: ['EMT', '急救'] },
            { role: '搜救人員', count: Math.round(params.affectedPopulation * 0.005 * baseMultiplier) + 5, skills: ['搜救', '繩索技術'] },
            { role: '物資管理員', count: Math.round(params.affectedPopulation * 0.001) + 2, skills: ['物流管理'] },
            { role: '心理輔導員', count: Math.round(params.affectedPopulation * 0.002) + 1, skills: ['心理諮商', 'PFA'] },
            { role: '通訊人員', count: Math.ceil(params.duration / 8) * 2, skills: ['無線電', '通訊設備'] },
        ];

        return {
            scenarioName: `${params.magnitude} ${this.translateDisasterType(params.disasterType)}`,
            duration: `${params.duration} 小時`,
            affectedArea: params.location,
            estimatedCasualties,
            resourcesNeeded,
            personnelNeeded,
        };
    }

    /**
     * Get resource matching suggestions
     */
    async matchResources(params: {
        required: { type: string; quantity: number }[];
        available: { type: string; quantity: number; location: string }[];
        targetLocation: string;
    }): Promise<{
        matched: { type: string; from: string; quantity: number; distance?: number }[];
        unmatched: { type: string; shortfall: number }[];
    }> {
        const matched: { type: string; from: string; quantity: number }[] = [];
        const unmatched: { type: string; shortfall: number }[] = [];

        for (const req of params.required) {
            let remaining = req.quantity;

            // Find matching available resources
            const sources = params.available
                .filter(a => a.type === req.type && a.quantity > 0)
                .sort((a, b) => {
                    // Prioritize closer locations
                    if (a.location === params.targetLocation) return -1;
                    if (b.location === params.targetLocation) return 1;
                    return 0;
                });

            for (const source of sources) {
                if (remaining <= 0) break;

                const takeQuantity = Math.min(remaining, source.quantity);
                matched.push({
                    type: req.type,
                    from: source.location,
                    quantity: takeQuantity,
                });
                remaining -= takeQuantity;
                source.quantity -= takeQuantity;
            }

            if (remaining > 0) {
                unmatched.push({
                    type: req.type,
                    shortfall: remaining,
                });
            }
        }

        return { matched, unmatched };
    }

    private translateDisasterType(type: string): string {
        const translations: Record<string, string> = {
            earthquake: '地震',
            flood: '水災',
            typhoon: '颱風',
            fire: '火災',
            other: '其他災害',
        };
        return translations[type] || type;
    }
}
