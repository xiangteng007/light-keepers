import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseAgent, AgentCapability } from './base.agent';
import { AiOrchestratorService } from '../core/ai-orchestrator.service';

export interface Volunteer {
    id: string;
    name: string;
    skills: string[];
    location: { lat: number; lng: number };
    status: 'available' | 'busy' | 'offline';
    fatigueLevel: number; // 0-100
    lastMission: Date | null;
}

export interface DispatchRequest {
    missionId: string;
    disasterType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    location: { lat: number; lng: number };
    requiredSkills: string[];
    requiredCount: number;
}

export interface DispatchPlan {
    missionId: string;
    selectedVolunteers: string[];
    estimatedArrival: number; // minutes
    alternates: string[];
    reasoning: string;
    confidence: number;
}

/**
 * Dispatcher Agent - 智慧派遣代理
 * 
 * 負責：
 * - 智慧志工派遣
 * - 技能匹配
 * - 疲勞輪替管理
 * - START 檢傷優先序
 */
@Injectable()
export class DispatcherAgent extends BaseAgent {
    readonly id = 'dispatcher-agent';
    readonly name = 'Dispatcher Agent';
    readonly capabilities: AgentCapability[] = [
        { name: 'smart-dispatch', description: '智慧派遣' },
        { name: 'skill-matching', description: '技能匹配' },
        { name: 'fatigue-management', description: '疲勞管理' },
        { name: 'triage-prioritization', description: '檢傷優先序' },
    ];

    constructor(
        orchestrator: AiOrchestratorService,
        eventEmitter: EventEmitter2,
    ) {
        super(orchestrator, eventEmitter);
    }

    /**
     * 規劃派遣計畫
     */
    async planDispatch(
        request: DispatchRequest,
        availableVolunteers: Volunteer[]
    ): Promise<DispatchPlan> {
        
        // 預處理：過濾可用志工
        const candidates = availableVolunteers.filter(v => 
            v.status === 'available' && v.fatigueLevel < 80
        );

        const prompt = `
你是災難應變志工派遣專家。根據以下資訊規劃最佳派遣計畫：

任務需求:
- 任務ID: ${request.missionId}
- 災害類型: ${request.disasterType}
- 嚴重程度: ${request.severity}
- 位置: ${request.location.lat}, ${request.location.lng}
- 需要技能: ${request.requiredSkills.join(', ')}
- 需要人數: ${request.requiredCount}

可用志工 (${candidates.length} 人):
${JSON.stringify(candidates.map(v => ({
    id: v.id,
    name: v.name,
    skills: v.skills,
    location: v.location,
    fatigueLevel: v.fatigueLevel,
    hoursSinceLastMission: v.lastMission 
        ? Math.round((Date.now() - new Date(v.lastMission).getTime()) / 3600000)
        : 999
})), null, 2)}

派遣原則:
1. 技能匹配優先
2. 距離最近
3. 疲勞度低優先
4. 休息時間長優先

請以 JSON 格式回覆：
{
  "selectedVolunteers": ["<志工ID1>", ...],
  "estimatedArrival": <預估抵達分鐘>,
  "alternates": ["<候補志工ID>", ...],
  "reasoning": "<選擇理由>",
  "confidence": <0.0-1.0>
}
`;

        const result = await this.submitTask('reasoning', 'critical', prompt, request);

        if (!result.success) {
            throw new Error(`Dispatch planning failed: ${result.error}`);
        }

        // 解析結果
        const jsonMatch = result.result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse dispatch plan');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const plan: DispatchPlan = {
            missionId: request.missionId,
            selectedVolunteers: parsed.selectedVolunteers,
            estimatedArrival: parsed.estimatedArrival,
            alternates: parsed.alternates,
            reasoning: parsed.reasoning,
            confidence: parsed.confidence,
        };

        // 發出派遣事件
        this.eventEmitter.emit('dispatch.planned', plan);

        return plan;
    }

    /**
     * START 檢傷優先序排序
     */
    async triagePrioritize(
        incidents: Array<{
            id: string;
            description: string;
            casualties: number;
            severity: string;
            accessDifficulty: string;
        }>
    ): Promise<string[]> {
        const prompt = `
使用 START 檢傷分類法對以下事件進行優先序排序：

事件列表:
${JSON.stringify(incidents, null, 2)}

START 分類原則:
- 紅色(立即): 可呼吸、有脈搏、需立即處置
- 黃色(延遲): 傷勢嚴重但穩定
- 綠色(輕傷): 可自行行走
- 黑色(死亡/無望): 資源分配考量

請回覆事件ID排序陣列，最緊急的排最前：
["<事件ID1>", "<事件ID2>", ...]
`;

        const result = await this.submitTask('reasoning', 'critical', prompt);

        if (!result.success) {
            // 回退：按傷亡人數排序
            return incidents
                .sort((a, b) => b.casualties - a.casualties)
                .map(i => i.id);
        }

        try {
            const arrayMatch = result.result.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }
        } catch {
            // 解析失敗
        }

        return incidents.map(i => i.id);
    }

    /**
     * 處理來自其他 Agent 的訊息
     */
    protected onMessage(from: string, message: any): void {
        super.onMessage(from, message);

        if (message.type === 'threat-assessment' && from === 'intel-agent') {
            // Intel Agent 發現威脅，準備派遣
            this.logger.log(`Received threat assessment: ${message.assessment.id}`);
            
            // 觸發事件通知系統準備派遣
            this.eventEmitter.emit('dispatch.prepare', {
                threatId: message.assessment.id,
                severity: message.assessment.severity,
                location: message.assessment.location,
            });
        }
    }

    /**
     * 決策核准後執行派遣
     */
    protected onDecisionApproved(decision: any): void {
        super.onDecisionApproved(decision);
        
        // 執行實際派遣
        this.eventEmitter.emit('dispatch.execute', {
            decisionId: decision.id,
            data: decision.data,
        });
    }
}
