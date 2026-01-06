import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Auto Summary Service
 * AI-powered SITREP (Situation Report) generation
 * 
 * 📋 需要設定:
 * - GEMINI_API_KEY: Google AI API Key
 */
@Injectable()
export class AutoSummaryService {
    private readonly logger = new Logger(AutoSummaryService.name);

    constructor(private configService: ConfigService) { }

    /**
     * 產生 SITREP
     */
    async generateSitrep(incidentData: IncidentData): Promise<SitrepReport> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        const prompt = `根據以下災害事件資料，產生一份簡潔的 SITREP 報告（中文）：

事件資料：
${JSON.stringify(incidentData, null, 2)}

請產生包含以下區塊的報告：
1. 摘要（一句話）
2. 情況概述
3. 資源部署
4. 傷亡統計
5. 下一步行動

格式為 Markdown`;

        if (!apiKey) {
            return this.generateMockSitrep(incidentData);
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                },
            );

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            return {
                title: `SITREP - ${incidentData.name}`,
                content,
                generatedAt: new Date(),
                incidentId: incidentData.id,
                version: 1,
            };
        } catch (error) {
            this.logger.error('SITREP generation failed', error);
            return this.generateMockSitrep(incidentData);
        }
    }

    /**
     * 摘要通訊記錄
     */
    async summarizeComms(messages: CommMessage[]): Promise<CommSummary> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey || messages.length === 0) {
            return { summary: '無通訊記錄', keyPoints: [], timeline: [] };
        }

        const prompt = `請摘要以下災害救援通訊記錄，提取重要資訊：
${messages.map((m) => `[${m.time}] ${m.sender}: ${m.content}`).join('\n')}

回傳 JSON：{ summary, keyPoints: string[], timeline: string[] }`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                },
            );

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const match = text.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
        } catch (error) {
            this.logger.error('Comms summary failed', error);
        }

        return { summary: '通訊摘要產生失敗', keyPoints: [], timeline: [] };
    }

    /**
     * 產生檢討報告草稿
     */
    async generateAarDraft(incidentId: string, feedback: string[]): Promise<string> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        const prompt = `根據以下救災回饋，產生事後檢討報告 (AAR) 草稿：

回饋：
${feedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}

報告應包含：優點、待改進、具體建議`;

        if (!apiKey) {
            return '# 事後檢討報告\n\n## 優點\n- 團隊協調良好\n\n## 待改進\n- 通訊延遲\n\n## 建議\n- 增加備用無線電';
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                },
            );

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (error) {
            return '報告產生失敗';
        }
    }

    private generateMockSitrep(data: IncidentData): SitrepReport {
        return {
            title: `SITREP - ${data.name}`,
            content: `# ${data.name} 情況報告

## 摘要
${data.type} 事件持續處理中

## 情況概述
時間：${data.startTime}
地點：${data.location}
狀態：${data.status}

## 資源部署
- 志工：進行中
- 物資：調度中

## 下一步行動
- 持續監控`,
            generatedAt: new Date(),
            incidentId: data.id,
            version: 1,
        };
    }
}

// Types
interface IncidentData { id: string; name: string; type: string; location: string; startTime: string; status: string; }
interface SitrepReport { title: string; content: string; generatedAt: Date; incidentId: string; version: number; }
interface CommMessage { time: string; sender: string; content: string; }
interface CommSummary { summary: string; keyPoints: string[]; timeline: string[]; }
