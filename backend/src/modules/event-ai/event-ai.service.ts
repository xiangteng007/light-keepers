import { Injectable, Logger } from '@nestjs/common';

export interface EventPattern {
    id: string;
    patternType: 'temporal' | 'spatial' | 'correlation' | 'sequence';
    description: string;
    confidence: number;
    eventTypes: string[];
    affectedAreas: string[];
    timePattern?: { dayOfWeek?: number[]; hourRange?: [number, number]; season?: string };
    recommendations: string[];
}

export interface RiskPrediction {
    areaId: string;
    areaName: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    factors: { factor: string; weight: number; value: number }[];
    predictedEventTypes: string[];
    recommendedActions: string[];
    validUntil: Date;
}

export interface ResourceEstimate {
    eventType: string;
    severity: string;
    estimatedPersonnel: number;
    estimatedVehicles: number;
    estimatedEquipment: { type: string; quantity: number }[];
    estimatedDuration: number; // hours
    confidence: number;
}

export interface ActionRecommendation {
    id: string;
    eventId: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    action: string;
    reason: string;
    resources: string[];
    estimatedImpact: string;
    createdAt: Date;
}

@Injectable()
export class EventAiService {
    private readonly logger = new Logger(EventAiService.name);
    private patterns: Map<string, EventPattern> = new Map();
    private predictions: Map<string, RiskPrediction> = new Map();

    constructor() {
        this.initializePatterns();
    }

    private initializePatterns() {
        const defaultPatterns: EventPattern[] = [
            {
                id: 'p1',
                patternType: 'temporal',
                description: '颱風季節水災高發期',
                confidence: 0.85,
                eventTypes: ['flood', 'landslide'],
                affectedAreas: ['北區', '東區'],
                timePattern: { season: 'summer' },
                recommendations: ['預置抽水設備', '清理排水溝', '預警廣播'],
            },
            {
                id: 'p2',
                patternType: 'spatial',
                description: '山區土石流高風險區域',
                confidence: 0.78,
                eventTypes: ['landslide', 'debris_flow'],
                affectedAreas: ['南區山區', '中區山區'],
                recommendations: ['設置監測站', '疏散演練', '道路預警'],
            },
            {
                id: 'p3',
                patternType: 'correlation',
                description: '大雨後48小時內土石流風險',
                confidence: 0.82,
                eventTypes: ['debris_flow'],
                affectedAreas: ['all'],
                recommendations: ['持續監測', '預備撤離', '道路封閉預案'],
            },
        ];
        defaultPatterns.forEach(p => this.patterns.set(p.id, p));
    }

    // ===== 模式識別 =====

    analyzeHistoricalPatterns(events: any[]): EventPattern[] {
        // 模擬分析歷史事件找出模式
        this.logger.log(`Analyzing ${events.length} historical events`);

        const discoveredPatterns: EventPattern[] = [];

        // 時間模式分析
        const byMonth: Record<number, number> = {};
        events.forEach(e => {
            const month = new Date(e.occurredAt).getMonth();
            byMonth[month] = (byMonth[month] || 0) + 1;
        });

        const peakMonths = Object.entries(byMonth)
            .sort((a, b) => +b[1] - +a[1])
            .slice(0, 3)
            .map(([m]) => +m);

        if (peakMonths.length > 0) {
            discoveredPatterns.push({
                id: `disc-${Date.now()}`,
                patternType: 'temporal',
                description: `事件高發期集中在 ${peakMonths.map(m => m + 1).join(', ')} 月`,
                confidence: 0.7,
                eventTypes: ['general'],
                affectedAreas: ['all'],
                recommendations: ['加強該時段巡邏', '預備額外人力'],
            });
        }

        return [...Array.from(this.patterns.values()), ...discoveredPatterns];
    }

    getPatterns(): EventPattern[] {
        return Array.from(this.patterns.values());
    }

    // ===== 風險預測 =====

    predictRisk(areaId: string, areaName: string): RiskPrediction {
        // 模擬風險評估
        const factors = [
            { factor: '歷史事件頻率', weight: 0.3, value: Math.random() },
            { factor: '地理位置風險', weight: 0.25, value: Math.random() },
            { factor: '季節因素', weight: 0.2, value: Math.random() },
            { factor: '近期天氣', weight: 0.15, value: Math.random() },
            { factor: '基礎設施狀況', weight: 0.1, value: Math.random() },
        ];

        const riskScore = factors.reduce((sum, f) => sum + f.weight * f.value, 0);

        let riskLevel: 'low' | 'medium' | 'high' | 'critical';
        if (riskScore < 0.25) riskLevel = 'low';
        else if (riskScore < 0.5) riskLevel = 'medium';
        else if (riskScore < 0.75) riskLevel = 'high';
        else riskLevel = 'critical';

        const prediction: RiskPrediction = {
            areaId,
            areaName,
            riskLevel,
            riskScore: Math.round(riskScore * 100),
            factors,
            predictedEventTypes: riskLevel === 'low' ? [] : ['flood', 'fire'],
            recommendedActions: this.getRecommendedActions(riskLevel),
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        this.predictions.set(areaId, prediction);
        return prediction;
    }

    private getRecommendedActions(riskLevel: string): string[] {
        switch (riskLevel) {
            case 'critical':
                return ['立即啟動應急預案', '通知所有相關人員', '準備疏散', '請求上級支援'];
            case 'high':
                return ['密切監控情況', '預備應急資源', '通知待命人員', '檢查通訊設備'];
            case 'medium':
                return ['定期監控', '確認資源儲備', '更新聯絡名單'];
            default:
                return ['維持正常監控', '例行巡查'];
        }
    }

    getAreaPredictions(): RiskPrediction[] {
        return Array.from(this.predictions.values());
    }

    // ===== 資源預估 =====

    estimateResources(eventType: string, severity: string, affectedPopulation: number): ResourceEstimate {
        const baseMultiplier = severity === 'critical' ? 2 : severity === 'high' ? 1.5 : 1;
        const popFactor = Math.ceil(affectedPopulation / 100);

        const estimate: ResourceEstimate = {
            eventType,
            severity,
            estimatedPersonnel: Math.ceil(10 * baseMultiplier * popFactor),
            estimatedVehicles: Math.ceil(3 * baseMultiplier),
            estimatedEquipment: [
                { type: '急救包', quantity: Math.ceil(20 * baseMultiplier * popFactor) },
                { type: '照明設備', quantity: Math.ceil(5 * baseMultiplier) },
                { type: '通訊設備', quantity: Math.ceil(10 * baseMultiplier) },
                { type: '擔架', quantity: Math.ceil(5 * baseMultiplier) },
            ],
            estimatedDuration: severity === 'critical' ? 48 : severity === 'high' ? 24 : 12,
            confidence: 0.75,
        };

        return estimate;
    }

    // ===== 行動建議 =====

    generateRecommendations(eventId: string, eventData: any): ActionRecommendation[] {
        const recommendations: ActionRecommendation[] = [];
        const now = new Date();

        // 根據事件類型生成建議
        if (eventData.severity === 'critical' || eventData.severity === 'high') {
            recommendations.push({
                id: `rec-${Date.now()}-1`,
                eventId,
                priority: 'urgent',
                action: '立即調派最近的待命小組',
                reason: '高嚴重度事件需要快速回應',
                resources: ['待命小組 A', '待命小組 B'],
                estimatedImpact: '可縮短回應時間 30%',
                createdAt: now,
            });
        }

        if (eventData.type === 'flood') {
            recommendations.push({
                id: `rec-${Date.now()}-2`,
                eventId,
                priority: 'high',
                action: '部署抽水設備',
                reason: '水災需要抽水作業',
                resources: ['抽水機 x3', '發電機 x2'],
                estimatedImpact: '加速排水進度',
                createdAt: now,
            });
        }

        // 一般建議
        recommendations.push({
            id: `rec-${Date.now()}-3`,
            eventId,
            priority: 'medium',
            action: '通知附近醫療設施',
            reason: '確保傷患可及時送醫',
            resources: ['急救車', '醫療人員'],
            estimatedImpact: '提升傷患存活率',
            createdAt: now,
        });

        return recommendations;
    }

    // ===== AI 摘要 =====

    generateEventSummary(eventData: any): string {
        return `【${eventData.type}事件摘要】
發生時間：${eventData.occurredAt}
地點：${eventData.location}
嚴重程度：${eventData.severity}
影響範圍：預估影響 ${eventData.affectedPopulation || '未知'} 人

AI 分析：
- 建議派遣 ${this.estimateResources(eventData.type, eventData.severity, eventData.affectedPopulation || 100).estimatedPersonnel} 名人員
- 預估處理時間：${this.estimateResources(eventData.type, eventData.severity, eventData.affectedPopulation || 100).estimatedDuration} 小時
- 關鍵行動：${this.generateRecommendations('', eventData)[0]?.action || '持續監控'}`;
    }
}
