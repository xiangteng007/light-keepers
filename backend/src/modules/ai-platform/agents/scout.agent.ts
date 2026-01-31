import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseAgent, AgentCapability } from './base.agent';
import { AiOrchestratorService } from '../core/ai-orchestrator.service';

export interface DroneReconData {
    droneId: string;
    location: { lat: number; lng: number };
    imageBase64?: string;
    timestamp: Date;
}

export interface ScoutReport {
    droneId: string;
    location: { lat: number; lng: number };
    disasterType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedArea: number; // square meters
    casualties: { estimated: number; confirmed: number };
    accessRoutes: string[];
    recommendations: string[];
    confidence: number;
}

/**
 * Scout Agent - 無人機偵察代理
 * 
 * 負責：
 * - 分析無人機航拍影像
 * - 災情嚴重度評估
 * - 影響範圍估算
 * - 進出路線建議
 */
@Injectable()
export class ScoutAgent extends BaseAgent {
    readonly id = 'scout-agent';
    readonly name = 'Scout Agent';
    readonly capabilities: AgentCapability[] = [
        { name: 'aerial-analysis', description: '航拍影像分析' },
        { name: 'damage-assessment', description: '災損評估' },
        { name: 'route-suggestion', description: '進出路線建議' },
    ];

    constructor(
        orchestrator: AiOrchestratorService,
        eventEmitter: EventEmitter2,
    ) {
        super(orchestrator, eventEmitter);
    }

    /**
     * 分析無人機回傳的偵察數據
     */
    async analyzeRecon(data: DroneReconData): Promise<ScoutReport> {
        const prompt = `
你是災難應變航拍影像分析專家。分析以下無人機偵察數據並回報災情：

位置: ${data.location.lat}, ${data.location.lng}
時間: ${data.timestamp.toISOString()}
無人機編號: ${data.droneId}

請以 JSON 格式回報：
{
  "disasterType": "地震/水災/火災/土石流/..." 
  "severity": "low/medium/high/critical",
  "affectedArea": <估計影響面積(平方公尺)>,
  "casualties": { "estimated": <估計傷亡>, "confirmed": <確認傷亡> },
  "accessRoutes": ["<可用進入路線1>", "..."],
  "recommendations": ["<建議行動1>", "..."],
  "confidence": <0.0-1.0 信心度>,
  "reasoning": "<分析理由>"
}
`;

        const result = await this.submitTask('vision', 'critical', prompt, data);

        if (!result.success) {
            throw new Error(`Scout analysis failed: ${result.error}`);
        }

        // 解析結果
        const jsonMatch = result.result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse scout report');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const report: ScoutReport = {
            droneId: data.droneId,
            location: data.location,
            disasterType: parsed.disasterType,
            severity: parsed.severity,
            affectedArea: parsed.affectedArea,
            casualties: parsed.casualties,
            accessRoutes: parsed.accessRoutes,
            recommendations: parsed.recommendations,
            confidence: parsed.confidence,
        };

        // 通知 Intel Agent
        await this.sendMessage('intel-agent', {
            type: 'scout-report',
            report,
        });

        return report;
    }

    /**
     * 請求無人機群執行區域掃描
     */
    async requestAreaScan(
        center: { lat: number; lng: number },
        radiusMeters: number
    ): Promise<void> {
        this.eventEmitter.emit('drone.scan.requested', {
            agentId: this.id,
            center,
            radiusMeters,
            timestamp: new Date(),
        });

        this.logger.log(`Area scan requested: center=${center.lat},${center.lng}, radius=${radiusMeters}m`);
    }

    /**
     * 處理來自其他 Agent 的訊息
     */
    protected onMessage(from: string, message: any): void {
        super.onMessage(from, message);

        if (message.type === 'scan-request' && from === 'dispatcher-agent') {
            // Dispatcher 請求掃描特定區域
            this.requestAreaScan(message.location, message.radius || 500);
        }
    }
}
