import { Injectable, Logger } from '@nestjs/common';
import { GeminiClientService } from '../core/gemini-client.service';

export interface ReasoningContext {
    facts: string[];
    constraints: string[];
    objectives: string[];
}

export interface ReasoningResult {
    conclusion: string;
    steps: string[];
    confidence: number;
    alternatives?: string[];
    risks?: string[];
}

/**
 * Reasoning Capability - 推理能力
 * 
 * 提供：
 * - 邏輯推理
 * - 決策分析
 * - 情境評估
 * - 多步驟規劃
 */
@Injectable()
export class ReasoningCapability {
    private readonly logger = new Logger(ReasoningCapability.name);

    constructor(private readonly geminiClient: GeminiClientService) {}

    /**
     * 執行邏輯推理
     */
    async reason(
        question: string,
        context: ReasoningContext
    ): Promise<ReasoningResult> {
        const prompt = `
你是災難應變決策支援專家。根據以下資訊進行邏輯推理：

問題: ${question}

已知事實:
${context.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

限制條件:
${context.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

目標:
${context.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

請進行步驟式推理，以 JSON 格式回覆：
{
  "conclusion": "<最終結論>",
  "steps": ["<推理步驟1>", "<推理步驟2>", ...],
  "confidence": <0.0-1.0>,
  "alternatives": ["<替代方案1>", ...],
  "risks": ["<潛在風險1>", ...]
}
`;

        try {
            const response = await this.geminiClient.generateContent(prompt, {
                model: 'gemini-1.5-pro', // 複雜推理使用 Pro
                temperature: 0.4,
            });

            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {
                conclusion: response.text,
                steps: [],
                confidence: 0.5,
            };
        } catch (error) {
            this.logger.error(`Reasoning failed: ${error}`);
            throw error;
        }
    }

    /**
     * 情境模擬與預測
     */
    async simulateScenario(
        currentSituation: string,
        possibleActions: string[],
        timeHorizon: string = '24 hours'
    ): Promise<Array<{ action: string; outcomes: string[]; probability: number }>> {
        const prompt = `
模擬以下災難情境的可能發展：

當前情況: ${currentSituation}
時間範圍: ${timeHorizon}

可能行動:
${possibleActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

請預測每個行動的可能結果，以 JSON 陣列格式回覆：
[
  {
    "action": "<行動>",
    "outcomes": ["<結果1>", "<結果2>", ...],
    "probability": <成功機率 0.0-1.0>
  },
  ...
]
`;

        try {
            const response = await this.geminiClient.generateContent(prompt, {
                model: 'gemini-1.5-pro',
                temperature: 0.5,
            });

            const arrayMatch = response.text.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }

            return [];
        } catch (error) {
            this.logger.error(`Scenario simulation failed: ${error}`);
            throw error;
        }
    }

    /**
     * 生成行動方案
     */
    async generateActionPlan(
        objective: string,
        resources: string[],
        constraints: string[]
    ): Promise<{ steps: string[]; timeline: string; dependencies: string[] }> {
        const prompt = `
為以下目標生成行動方案：

目標: ${objective}

可用資源:
${resources.map((r, i) => `${i + 1}. ${r}`).join('\n')}

限制條件:
${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

請以 JSON 格式回覆詳細行動計畫：
{
  "steps": ["<步驟1>", "<步驟2>", ...],
  "timeline": "<預估時程>",
  "dependencies": ["<相依性1>", ...]
}
`;

        try {
            const response = await this.geminiClient.generateContent(prompt, {
                temperature: 0.4,
            });

            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {
                steps: [],
                timeline: 'Unknown',
                dependencies: [],
            };
        } catch (error) {
            this.logger.error(`Action plan generation failed: ${error}`);
            throw error;
        }
    }

    /**
     * 評估決策風險
     */
    async assessRisk(
        decision: string,
        stakeholders: string[]
    ): Promise<Array<{ risk: string; severity: string; mitigation: string }>> {
        const prompt = `
評估以下決策的潛在風險：

決策: ${decision}

利害關係人:
${stakeholders.map((s, i) => `${i + 1}. ${s}`).join('\n')}

請以 JSON 陣列格式回覆風險評估：
[
  {
    "risk": "<風險描述>",
    "severity": "low/medium/high/critical",
    "mitigation": "<緩解措施>"
  },
  ...
]
`;

        try {
            const response = await this.geminiClient.generateContent(prompt, {
                temperature: 0.4,
            });

            const arrayMatch = response.text.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }

            return [];
        } catch (error) {
            this.logger.error(`Risk assessment failed: ${error}`);
            throw error;
        }
    }
}
