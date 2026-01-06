/**
 * PFA 聊天機器人服務 (HopeBot)
 * 模組 C: 心理急救引導式對話
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PFAChatLog } from './entities/mood-log.entity';

// PFA (Psychological First Aid) 原則
const PFA_SYSTEM_PROMPT = `你是「光守護者」平台的心理支持機器人 HopeBot。你的角色是提供溫暖、同理心的陪伴對話，遵循心理急救 (PFA) 原則。

## 核心原則

1. **觀察 (Look)**：注意使用者的情緒狀態和用詞
2. **傾聽 (Listen)**：積極傾聽，不急於給建議
3. **連結 (Link)**：在適當時機提供資源連結

## 對話指引

### 你應該：
- 以溫暖、關懷的語氣回應
- 使用「我聽到你說...」「這聽起來...」等同理句型
- 肯定使用者的感受是正常的
- 在對話結尾提供希望感
- 適時詢問「現在最需要什麼？」

### 你不應該：
- 提供診斷或治療建議
- 說「我理解你的感受」（沒有人能完全理解另一個人）
- 使用「至少...」「你應該...」等否定性語句
- 過度追問創傷細節

### 危機處理：
如果使用者表達自殺意念或自傷行為，請：
1. 表達關心：「聽到這個我很擔心你」
2. 提供資源：「如果你正處於危機中，請撥打 1925 安心專線」
3. 不要長時間獨自處理

## 回應風格
- 使用繁體中文
- 簡潔但溫暖
- 每次回應 2-4 句話為佳
- 適度使用表情符號增加溫度 💙`;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface SentimentResult {
    score: number; // -1 to 1
    label: 'negative' | 'neutral' | 'positive';
}

@Injectable()
export class PFAChatbotService {
    private readonly logger = new Logger(PFAChatbotService.name);

    // 對話歷史緩存 (sessionId -> messages)
    private conversationCache: Map<string, ChatMessage[]> = new Map();

    constructor(
        @InjectRepository(PFAChatLog)
        private chatLogRepository: Repository<PFAChatLog>,
    ) { }

    // ==================== 對話處理 ====================

    /**
     * 處理使用者訊息
     */
    async chat(userId: string, sessionId: string, message: string): Promise<{
        response: string;
        sentiment: SentimentResult;
        resources?: string[];
    }> {
        // 取得或初始化對話歷史
        let history = this.conversationCache.get(sessionId) || [];

        // 添加使用者訊息
        history.push({ role: 'user', content: message });

        // 分析情緒
        const sentiment = this.analyzeSentiment(message);

        // 檢查危機關鍵詞
        const crisisDetected = this.detectCrisisKeywords(message);

        // 生成回應
        let response: string;
        let resources: string[] | undefined;

        if (crisisDetected) {
            response = await this.handleCrisisResponse(message);
            resources = [
                '🆘 安心專線：1925（24小時）',
                '🏥 生命線：1995',
                '📞 張老師專線：1980',
            ];
        } else {
            response = await this.generateResponse(history, sentiment);
        }

        // 添加助手回應到歷史
        history.push({ role: 'assistant', content: response });

        // 保持歷史在合理範圍
        if (history.length > 20) {
            history = history.slice(-20);
        }
        this.conversationCache.set(sessionId, history);

        // 儲存對話記錄
        await this.chatLogRepository.save({
            userId,
            sessionId,
            userMessage: message,
            botResponse: response,
            sentiment: { score: sentiment.score, label: sentiment.label },
        });

        this.logger.log(`HopeBot chat for user ${userId}, sentiment: ${sentiment.label}`);

        return { response, sentiment, resources };
    }

    /**
     * 取得使用者的對話歷史
     */
    async getChatHistory(userId: string, sessionId?: string): Promise<PFAChatLog[]> {
        const where: any = { userId };
        if (sessionId) {
            where.sessionId = sessionId;
        }

        return this.chatLogRepository.find({
            where,
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }

    /**
     * 開始新的對話
     */
    startNewSession(sessionId: string): string {
        this.conversationCache.set(sessionId, []);

        return '你好！我是 HopeBot 💙\n\n' +
            '我是光守護者的心理支持夥伴。今天過得如何？\n' +
            '無論你想分享什麼，我都在這裡傾聽。';
    }

    // ==================== 情緒分析 ====================

    private analyzeSentiment(text: string): SentimentResult {
        // 簡單的關鍵詞情緒分析
        const positiveWords = ['開心', '快樂', '感謝', '希望', '好', '棒', '加油', '感恩', '幸福', '平靜'];
        const negativeWords = ['難過', '傷心', '害怕', '焦慮', '累', '痛', '絕望', '無助', '憤怒', '崩潰', '不想', '放棄'];

        let score = 0;
        const lowerText = text.toLowerCase();

        positiveWords.forEach(word => {
            if (lowerText.includes(word)) score += 0.2;
        });

        negativeWords.forEach(word => {
            if (lowerText.includes(word)) score -= 0.2;
        });

        // 限制範圍
        score = Math.max(-1, Math.min(1, score));

        let label: SentimentResult['label'] = 'neutral';
        if (score > 0.2) label = 'positive';
        else if (score < -0.2) label = 'negative';

        return { score: Math.round(score * 100) / 100, label };
    }

    private detectCrisisKeywords(text: string): boolean {
        const crisisKeywords = [
            '自殺', '不想活', '結束生命', '活不下去', '死掉', '自我傷害',
            '想死', '傷害自己', '尋短', '解脫', '離開這個世界'
        ];

        return crisisKeywords.some(keyword => text.includes(keyword));
    }

    // ==================== 回應生成 ====================

    private async generateResponse(history: ChatMessage[], sentiment: SentimentResult): Promise<string> {
        // 嘗試使用 Gemini API
        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey) {
            try {
                return await this.callGeminiAPI(history, sentiment);
            } catch (error) {
                this.logger.error('Gemini API error, falling back to templates', error);
            }
        }

        // 回退到模板回應
        return this.generateTemplateResponse(history, sentiment);
    }

    private async callGeminiAPI(history: ChatMessage[], sentiment: SentimentResult): Promise<string> {
        const apiKey = process.env.GEMINI_API_KEY;

        const messages = [
            { role: 'user', parts: [{ text: PFA_SYSTEM_PROMPT }] },
            ...history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            })),
        ];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: messages,
                    generationConfig: {
                        maxOutputTokens: 256,
                        temperature: 0.7,
                    },
                }),
            }
        );

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || this.generateTemplateResponse(history, sentiment);
    }

    private generateTemplateResponse(history: ChatMessage[], sentiment: SentimentResult): string {
        const lastUserMessage = history.filter(m => m.role === 'user').pop()?.content || '';

        if (sentiment.label === 'negative') {
            const responses = [
                '聽起來你正在經歷一段不容易的時光。感受到難過或疲憊是很正常的。💙',
                '謝謝你願意分享這些。你的感受是被看見的。現在最讓你掛心的是什麼呢？',
                '這聽起來真的很辛苦。你已經很努力了。現在有什麼是我可以幫忙的嗎？',
                '我聽到你說的了。在這樣的情況下，會有這些感受是很自然的。',
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }

        if (sentiment.label === 'positive') {
            const responses = [
                '很高興聽到這個！✨ 這樣的感受很珍貴。',
                '謝謝你分享這些好消息！讓自己享受這份平靜吧。💙',
                '真好！記得好好珍惜這樣的時刻。',
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }

        // 中性回應
        const responses = [
            '謝謝你的分享。可以多告訴我一些嗎？',
            '我在聽。現在的你感覺如何呢？',
            '嗯，我懂的。還有什麼想說的嗎？我都在這裡。💙',
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    private async handleCrisisResponse(message: string): Promise<string> {
        return '聽到這個，我非常擔心你。💙\n\n' +
            '你現在的感受很重要，你不需要獨自面對。\n\n' +
            '如果你正處於危機中，請撥打 **1925 安心專線**（24小時），會有專業的人員陪伴你。\n\n' +
            '你願意告訴我，現在最需要什麼嗎？';
    }

    // ==================== 統計 ====================

    async getStats(): Promise<{
        totalConversations: number;
        todayConversations: number;
        averageSentiment: number;
        crisisDetected: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalConversations, todayConversations, sentimentResult] = await Promise.all([
            this.chatLogRepository.count(),
            this.chatLogRepository.count({ where: { createdAt: today } }),
            this.chatLogRepository
                .createQueryBuilder('log')
                .select("AVG(log.sentiment->>'score')", 'avg')
                .getRawOne(),
        ]);

        return {
            totalConversations,
            todayConversations,
            averageSentiment: parseFloat(sentimentResult?.avg || '0'),
            crisisDetected: 0, // TODO: 實作危機計數
        };
    }
}
