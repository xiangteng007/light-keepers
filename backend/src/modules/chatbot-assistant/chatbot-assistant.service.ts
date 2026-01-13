/**
 * Chatbot Assistant Service
 * 
 * AI-powered disaster response assistant using Gemini
 * v2.0: Real AI integration
 */

import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider, ChatMessage } from './providers/gemini.provider';

export interface ChatSession {
    id: string;
    userId: string;
    messages: ChatMessage[];
    createdAt: Date;
    lastActivity: Date;
    context?: Record<string, any>;
}

export interface ChatResponse {
    message: string;
    suggestions?: string[];
    actions?: { type: string; label: string; payload: any }[];
}

@Injectable()
export class ChatbotAssistantService {
    private readonly logger = new Logger(ChatbotAssistantService.name);
    private sessions: Map<string, ChatSession> = new Map();

    private readonly SYSTEM_PROMPT = `你是「光守護者」(Light Keepers) 災害防救平台的 AI 助手。

你的職責：
1. 協助使用者了解當前災情狀況
2. 提供災害應變建議
3. 協助派遣志工和調度資源
4. 回答關於平台功能的問題
5. 提供防災知識教育

回答時請：
- 使用繁體中文
- 簡潔明瞭
- 如涉及緊急狀況，優先提供行動建議
- 適時建議相關的平台功能

你可以處理的主題：
- 災害類型：地震、颱風、水災、火災、土石流等
- 資源調度：物資、車輛、設備
- 人員管理：志工派遣、勤務安排
- 通報處理：事件回報、狀態更新
`;

    constructor(private readonly geminiProvider: GeminiProvider) { }

    /**
     * Start a new chat session
     */
    startSession(userId: string, context?: Record<string, any>): ChatSession {
        const session: ChatSession = {
            id: `session-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            userId,
            messages: [],
            createdAt: new Date(),
            lastActivity: new Date(),
            context,
        };

        this.sessions.set(session.id, session);
        this.logger.log(`Started chat session ${session.id} for user ${userId}`);

        return session;
    }

    /**
     * Send a message and get AI response
     */
    async sendMessage(sessionId: string, userMessage: string): Promise<ChatResponse> {
        let session = this.sessions.get(sessionId);

        if (!session) {
            // Auto-create session if not exists
            session = this.startSession('unknown');
            this.sessions.set(sessionId, session);
        }

        // Add user message to history
        session.messages.push({
            role: 'user',
            content: userMessage,
        });

        // Build conversation with system prompt
        const conversationMessages: ChatMessage[] = [
            { role: 'user', content: this.SYSTEM_PROMPT },
            { role: 'model', content: '我是光守護者 AI 助手，隨時為您提供災害防救相關的協助。請問有什麼我可以幫忙的嗎？' },
            ...session.messages,
        ];

        // Get AI response
        const response = await this.geminiProvider.chat(conversationMessages, {
            temperature: 0.7,
            maxOutputTokens: 1024,
        });

        // Add AI response to history
        session.messages.push({
            role: 'model',
            content: response.text,
        });

        session.lastActivity = new Date();

        // Generate suggestions based on context
        const suggestions = this.generateSuggestions(userMessage, response.text);
        const actions = this.extractActions(response.text);

        return {
            message: response.text,
            suggestions,
            actions,
        };
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): ChatSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Get user's active sessions
     */
    getUserSessions(userId: string): ChatSession[] {
        return Array.from(this.sessions.values())
            .filter(s => s.userId === userId)
            .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    }

    /**
     * End a session
     */
    endSession(sessionId: string): boolean {
        return this.sessions.delete(sessionId);
    }

    /**
     * Quick query without session
     */
    async quickQuery(question: string): Promise<string> {
        const prompt = `${this.SYSTEM_PROMPT}

使用者問題：${question}

請簡潔回答：`;

        const response = await this.geminiProvider.generateContent(prompt, {
            temperature: 0.7,
            maxOutputTokens: 512,
        });

        return response.text;
    }

    /**
     * Analyze disaster report
     */
    async analyzeReport(reportContent: string): Promise<{
        summary: string;
        severity: string;
        category: string;
        suggestedActions: string[];
    }> {
        const analysis = await this.geminiProvider.analyzeDisasterText(reportContent);

        return {
            summary: analysis.summary || reportContent.substring(0, 100),
            severity: analysis.severity || 'medium',
            category: analysis.disasterType || '一般事件',
            suggestedActions: analysis.suggestedActions || ['請持續關注事態發展'],
        };
    }

    // ===== Private Methods =====

    private generateSuggestions(userMessage: string, aiResponse: string): string[] {
        const suggestions: string[] = [];
        const lower = userMessage.toLowerCase();

        if (lower.includes('天氣') || lower.includes('氣象')) {
            suggestions.push('查看即時天氣', '查看天氣預報');
        }

        if (lower.includes('任務') || lower.includes('派遣')) {
            suggestions.push('查看待處理任務', '新增任務');
        }

        if (lower.includes('物資') || lower.includes('資源')) {
            suggestions.push('查看庫存', '申請物資');
        }

        if (lower.includes('志工') || lower.includes('人員')) {
            suggestions.push('查看可用志工', '查看勤務表');
        }

        // Default suggestions if none matched
        if (suggestions.length === 0) {
            suggestions.push('查看最新警報', '開始新任務', '聯繫支援');
        }

        return suggestions.slice(0, 3);
    }

    private extractActions(responseText: string): { type: string; label: string; payload: any }[] {
        const actions: { type: string; label: string; payload: any }[] = [];

        if (responseText.includes('警報') || responseText.includes('通知')) {
            actions.push({
                type: 'navigate',
                label: '查看警報',
                payload: { path: '/geo/alerts' },
            });
        }

        if (responseText.includes('任務') || responseText.includes('派遣')) {
            actions.push({
                type: 'navigate',
                label: '任務中心',
                payload: { path: '/command/tasks' },
            });
        }

        if (responseText.includes('物資') || responseText.includes('資源')) {
            actions.push({
                type: 'navigate',
                label: '資源管理',
                payload: { path: '/logistics/inventory' },
            });
        }

        return actions;
    }

    /**
     * Clean up old sessions (call periodically)
     */
    cleanupOldSessions(maxAgeHours: number = 24): number {
        const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        let cleaned = 0;

        for (const [id, session] of this.sessions) {
            if (session.lastActivity < cutoff) {
                this.sessions.delete(id);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.log(`Cleaned up ${cleaned} old chat sessions`);
        }

        return cleaned;
    }
}
