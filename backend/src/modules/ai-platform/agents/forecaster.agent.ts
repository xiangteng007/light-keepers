import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseAgent, AgentCapability } from './base.agent';
import { AiOrchestratorService } from '../core/ai-orchestrator.service';

export interface ResourceInventory {
    itemId: string;
    name: string;
    category: string;
    currentStock: number;
    minStock: number;
    unit: string;
    lastRestocked: Date;
    dailyConsumption: number;
}

export interface DemandForecast {
    itemId: string;
    predictedDemand: number;
    timeframe: string;
    confidence: number;
    reasoning: string;
}

export interface ReorderRecommendation {
    itemId: string;
    itemName: string;
    currentStock: number;
    recommendedOrder: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    reasoning: string;
}

/**
 * Forecaster Agent - 資源預測代理
 * 
 * 負責：
 * - 物資需求預測
 * - 庫存分析
 * - 自動採購建議
 * - 捐贈媒合
 */
@Injectable()
export class ForecasterAgent extends BaseAgent {
    readonly id = 'forecaster-agent';
    readonly name = 'Forecaster Agent';
    readonly capabilities: AgentCapability[] = [
        { name: 'demand-forecasting', description: '需求預測' },
        { name: 'inventory-analysis', description: '庫存分析' },
        { name: 'reorder-recommendation', description: '採購建議' },
        { name: 'donation-matching', description: '捐贈媒合' },
    ];

    constructor(
        orchestrator: AiOrchestratorService,
        eventEmitter: EventEmitter2,
    ) {
        super(orchestrator, eventEmitter);
    }

    /**
     * 預測物資需求
     */
    async forecastDemand(
        inventory: ResourceInventory[],
        missionType: string,
        scale: 'small' | 'medium' | 'large',
        duration: number // days
    ): Promise<DemandForecast[]> {
        const prompt = `
你是災難應變物資預測專家。根據以下資訊預測物資需求：

任務類型: ${missionType}
規模: ${scale}
預估持續時間: ${duration} 天

現有庫存:
${JSON.stringify(inventory.map(i => ({
    name: i.name,
    category: i.category,
    stock: i.currentStock,
    unit: i.unit,
    dailyUsage: i.dailyConsumption,
})), null, 2)}

請預測各物資未來需求，以 JSON 陣列格式回覆：
[
  {
    "itemId": "<物資ID>",
    "predictedDemand": <預估需求量>,
    "timeframe": "<時間範圍>",
    "confidence": <0.0-1.0>,
    "reasoning": "<預測理由>"
  },
  ...
]
`;

        const result = await this.submitTask('analysis', 'standard', prompt);

        if (!result.success) {
            throw new Error(`Demand forecast failed: ${result.error}`);
        }

        try {
            const arrayMatch = result.result.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }
        } catch (error) {
            this.logger.error(`Failed to parse forecast: ${error}`);
        }

        // 回退：基於歷史消耗的簡單預測
        return inventory.map(item => ({
            itemId: item.itemId,
            predictedDemand: Math.ceil(item.dailyConsumption * duration * 1.5),
            timeframe: `${duration} days`,
            confidence: 0.6,
            reasoning: 'Based on historical consumption with 50% buffer',
        }));
    }

    /**
     * 生成採購建議
     */
    async generateReorderRecommendations(
        inventory: ResourceInventory[]
    ): Promise<ReorderRecommendation[]> {
        const lowStockItems = inventory.filter(i => 
            i.currentStock <= i.minStock * 1.5
        );

        if (lowStockItems.length === 0) {
            return [];
        }

        const prompt = `
你是物資管理專家。根據以下庫存狀況提供採購建議：

低庫存物資:
${JSON.stringify(lowStockItems.map(i => ({
    id: i.itemId,
    name: i.name,
    current: i.currentStock,
    minimum: i.minStock,
    unit: i.unit,
    dailyUsage: i.dailyConsumption,
    daysSinceRestock: Math.round((Date.now() - new Date(i.lastRestocked).getTime()) / 86400000),
})), null, 2)}

請以 JSON 陣列格式回覆採購建議：
[
  {
    "itemId": "<物資ID>",
    "itemName": "<物資名稱>",
    "currentStock": <現有庫存>,
    "recommendedOrder": <建議採購量>,
    "urgency": "low/medium/high/critical",
    "reasoning": "<建議理由>"
  },
  ...
]
`;

        const result = await this.submitTask('analysis', 'standard', prompt);

        if (!result.success) {
            // 回退：簡單計算
            return lowStockItems.map(item => ({
                itemId: item.itemId,
                itemName: item.name,
                currentStock: item.currentStock,
                recommendedOrder: (item.minStock * 2) - item.currentStock,
                urgency: item.currentStock < item.minStock ? 'critical' : 'medium',
                reasoning: 'Stock below minimum threshold',
            }));
        }

        try {
            const arrayMatch = result.result.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                const recommendations = JSON.parse(arrayMatch[0]);
                
                // 發出高緊急度通知
                const criticalItems = recommendations.filter(
                    (r: ReorderRecommendation) => r.urgency === 'critical'
                );
                
                if (criticalItems.length > 0) {
                    this.eventEmitter.emit('inventory.critical', {
                        items: criticalItems,
                        timestamp: new Date(),
                    });
                }
                
                return recommendations;
            }
        } catch (error) {
            this.logger.error(`Failed to parse recommendations: ${error}`);
        }

        return [];
    }

    /**
     * 捐贈媒合建議
     */
    async matchDonation(
        donation: { items: string[]; quantity: number; donor: string },
        needs: Array<{ itemName: string; urgency: string; quantity: number }>
    ): Promise<{ matched: boolean; matchedNeeds: string[]; reasoning: string }> {
        const prompt = `
你是捐贈媒合專家。判斷以下捐贈是否符合需求：

捐贈內容:
- 捐贈者: ${donation.donor}
- 物資: ${donation.items.join(', ')}
- 數量: ${donation.quantity}

目前需求:
${JSON.stringify(needs, null, 2)}

請回覆 JSON：
{
  "matched": true/false,
  "matchedNeeds": ["<符合的需求項目>", ...],
  "reasoning": "<媒合或不媒合的理由>"
}
`;

        const result = await this.submitTask('classification', 'standard', prompt);

        if (!result.success) {
            return {
                matched: false,
                matchedNeeds: [],
                reasoning: `Analysis failed: ${result.error}`,
            };
        }

        try {
            const jsonMatch = result.result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch {
            // 解析失敗
        }

        return {
            matched: false,
            matchedNeeds: [],
            reasoning: 'Unable to parse matching result',
        };
    }
}
