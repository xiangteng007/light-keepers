import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseAgent, AgentCapability } from './base.agent';
import { AiOrchestratorService } from '../core/ai-orchestrator.service';

export interface IntelSource {
    type: 'social-media' | 'news' | 'government' | 'crowd-report' | 'scout';
    content: string;
    location?: { lat: number; lng: number };
    timestamp: Date;
    credibility: number;
}

export interface ThreatAssessment {
    id: string;
    disasterType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    location: { lat: number; lng: number; radius: number };
    affectedPopulation: number;
    timeline: string;
    sources: string[];
    confidence: number;
    recommendations: string[];
}

/**
 * Intel Agent - 情報整合代理
 * 
 * 負責：
 * - 多來源情報聚合
 * - 災情可信度評估
 * - 趨勢分析與預測
 * - 熱點識別
 */
@Injectable()
export class IntelAgent extends BaseAgent {
    readonly id = 'intel-agent';
    readonly name = 'Intel Agent';
    readonly capabilities: AgentCapability[] = [
        { name: 'source-aggregation', description: '多來源情報聚合' },
        { name: 'credibility-scoring', description: '可信度評分' },
        { name: 'trend-analysis', description: '趨勢分析' },
        { name: 'hotspot-detection', description: '熱點識別' },
    ];

    private intelBuffer: IntelSource[] = [];
    private readonly BUFFER_SIZE = 50;

    constructor(
        orchestrator: AiOrchestratorService,
        eventEmitter: EventEmitter2,
    ) {
        super(orchestrator, eventEmitter);
    }

    /**
     * 接收並處理情報來源
     */
    async ingestIntel(source: IntelSource): Promise<void> {
        this.intelBuffer.push(source);
        
        // 維持緩衝區大小
        if (this.intelBuffer.length > this.BUFFER_SIZE) {
            this.intelBuffer.shift();
        }

        // 如果有足夠情報，進行分析
        if (this.intelBuffer.length >= 5) {
            await this.analyzeIntelBuffer();
        }
    }

    /**
     * 分析情報緩衝區
     */
    async analyzeIntelBuffer(): Promise<ThreatAssessment | null> {
        const recentIntel = this.intelBuffer.slice(-10);
        
        const intelSummary = recentIntel.map(i => ({
            type: i.type,
            content: i.content.substring(0, 200),
            location: i.location,
            credibility: i.credibility,
        }));

        const prompt = `
你是災難情報分析專家。分析以下多來源情報並提供威脅評估：

情報來源:
${JSON.stringify(intelSummary, null, 2)}

請以 JSON 格式回報威脅評估：
{
  "hasSignificantThreat": true/false,
  "disasterType": "地震/水災/火災/土石流/無",
  "severity": "low/medium/high/critical",
  "location": { "lat": <緯度>, "lng": <經度>, "radius": <影響半徑公尺> },
  "affectedPopulation": <估計受影響人數>,
  "timeline": "<預測時程，如'未來2小時'>",
  "confidence": <0.0-1.0>,
  "recommendations": ["<行動建議1>", "..."],
  "reasoning": "<分析理由>"
}
`;

        const result = await this.submitTask('analysis', 'critical', prompt);

        if (!result.success) {
            this.logger.error(`Intel analysis failed: ${result.error}`);
            return null;
        }

        try {
            const jsonMatch = result.result.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return null;

            const parsed = JSON.parse(jsonMatch[0]);

            if (!parsed.hasSignificantThreat) {
                return null;
            }

            const assessment: ThreatAssessment = {
                id: `threat-${Date.now()}`,
                disasterType: parsed.disasterType,
                severity: parsed.severity,
                location: parsed.location,
                affectedPopulation: parsed.affectedPopulation,
                timeline: parsed.timeline,
                sources: recentIntel.map(i => i.type),
                confidence: parsed.confidence,
                recommendations: parsed.recommendations,
            };

            // 通知 Dispatcher Agent
            if (parsed.severity === 'high' || parsed.severity === 'critical') {
                await this.sendMessage('dispatcher-agent', {
                    type: 'threat-assessment',
                    assessment,
                });
            }

            // 發出事件
            this.eventEmitter.emit('intel.threat.detected', assessment);

            return assessment;
        } catch (error) {
            this.logger.error(`Failed to parse intel analysis: ${error}`);
            return null;
        }
    }

    /**
     * 評估單一情報的可信度
     */
    async evaluateCredibility(source: IntelSource): Promise<number> {
        // 基礎分數根據來源類型
        const baseScores: Record<string, number> = {
            'government': 0.9,
            'scout': 0.85,
            'news': 0.7,
            'crowd-report': 0.5,
            'social-media': 0.4,
        };

        const baseScore = baseScores[source.type] || 0.5;

        // 使用 AI 進一步評估
        const prompt = `
評估以下災情回報的可信度 (0.0-1.0)：

來源類型: ${source.type}
內容: ${source.content.substring(0, 300)}
時間: ${source.timestamp.toISOString()}

請回覆單一數字 (0.0-1.0)，代表可信度分數。
`;

        try {
            const result = await this.submitTask('classification', 'standard', prompt);
            if (result.success) {
                const score = parseFloat(result.result);
                if (!isNaN(score) && score >= 0 && score <= 1) {
                    return (baseScore + score) / 2; // 平均基礎分與 AI 評估
                }
            }
        } catch {
            // 使用基礎分數
        }

        return baseScore;
    }

    /**
     * 處理來自其他 Agent 的訊息
     */
    protected onMessage(from: string, message: any): void {
        super.onMessage(from, message);

        if (message.type === 'scout-report' && from === 'scout-agent') {
            // Scout Agent 回報
            this.ingestIntel({
                type: 'scout',
                content: JSON.stringify(message.report),
                location: message.report.location,
                timestamp: new Date(),
                credibility: message.report.confidence,
            });
        }
    }
}
