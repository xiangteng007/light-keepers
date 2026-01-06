import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Chatbot Assistant Service
 * AI-powered disaster Q&A chatbot
 */
@Injectable()
export class ChatbotAssistantService {
    private readonly logger = new Logger(ChatbotAssistantService.name);
    private conversationHistory: Map<string, ConversationMessage[]> = new Map();

    constructor(private configService: ConfigService) { }

    /**
     * 處理訊息
     */
    async chat(sessionId: string, message: string): Promise<ChatResponse> {
        const history = this.conversationHistory.get(sessionId) || [];
        history.push({ role: 'user', content: message, timestamp: new Date() });

        // 檢測意圖
        const intent = this.detectIntent(message);

        // 產生回應
        let response: string;
        switch (intent.type) {
            case 'emergency':
                response = await this.handleEmergency(message, intent);
                break;
            case 'status':
                response = await this.handleStatusQuery(message, intent);
                break;
            case 'shelter':
                response = await this.handleShelterQuery(message, intent);
                break;
            case 'report':
                response = await this.handleReportGuidance(message, intent);
                break;
            default:
                response = await this.generateAIResponse(message, history);
        }

        history.push({ role: 'assistant', content: response, timestamp: new Date() });
        this.conversationHistory.set(sessionId, history.slice(-20)); // 保留最後20則

        return {
            sessionId,
            response,
            intent: intent.type,
            suggestedActions: this.getSuggestedActions(intent.type),
        };
    }

    /**
     * 偵測意圖
     */
    private detectIntent(message: string): Intent {
        const lowerMsg = message.toLowerCase();

        if (['緊急', '救命', 'sos', '幫幫我'].some((k) => lowerMsg.includes(k))) {
            return { type: 'emergency', confidence: 0.95 };
        }
        if (['避難所', '收容所', '安置', '哪裡可以去'].some((k) => lowerMsg.includes(k))) {
            return { type: 'shelter', confidence: 0.9 };
        }
        if (['狀態', '進度', '目前', '最新'].some((k) => lowerMsg.includes(k))) {
            return { type: 'status', confidence: 0.85 };
        }
        if (['回報', '通報', '報案', '怎麼報'].some((k) => lowerMsg.includes(k))) {
            return { type: 'report', confidence: 0.85 };
        }

        return { type: 'general', confidence: 0.5 };
    }

    private async handleEmergency(message: string, intent: Intent): Promise<string> {
        return `🆘 緊急狀況處理

如果您或他人有立即危險:
1. 請撥打 119 (消防救災)
2. 請撥打 110 (警察)
3. 離開危險區域

如果可以，請告訴我:
- 您的位置
- 受傷人數
- 災害類型

我們會立即通知最近的救援團隊。`;
    }

    private async handleStatusQuery(message: string, intent: Intent): Promise<string> {
        return `📊 目前系統狀態

🟢 系統運作正常
📍 Active Events: 2
👥 On-duty Volunteers: 15
⚠️ Active Alerts: 3

如需詳細資訊，請問您想查詢:
1. 特定地區狀態
2. 特定事件進度
3. 志工部署情況`;
    }

    private async handleShelterQuery(message: string, intent: Intent): Promise<string> {
        return `🏠 避難所資訊

最近的避難所:
1. 📍 中正區活動中心 (距離 1.2km)
   地址: 台北市中正區xxx路xx號
   容量: 200人 | 目前: 45人

2. 📍 大安區公所 (距離 2.1km)
   地址: 台北市大安區xxx路xx號
   容量: 150人 | 目前: 23人

🔍 輸入您的位置可取得更精確的結果`;
    }

    private async handleReportGuidance(message: string, intent: Intent): Promise<string> {
        return `📝 災情回報指南

您可以透過以下方式回報:
1. 📱 使用 LINE 官方帳號拍照回報
2. 🌐 登入平台 → 災情回報
3. 📞 撥打 1999 市民熱線

回報時請提供:
✓ 地點 (地址或座標)
✓ 災害類型 (淹水/倒塌/火災等)
✓ 現場照片
✓ 傷亡情況`;
    }

    private async generateAIResponse(message: string, history: ConversationMessage[]): Promise<string> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            return '抱歉，目前 AI 服務暫時無法使用。請問您需要什麼協助？您可以詢問避難所、災情回報或目前狀態。';
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `你是台灣災害防救助手。請用繁體中文回答以下問題:\n\n${message}` }],
                        }],
                    }),
                },
            );

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '抱歉，我暫時無法回答這個問題。';
        } catch (error) {
            return '抱歉，目前無法連接 AI 服務。請稍後再試。';
        }
    }

    private getSuggestedActions(intentType: string): string[] {
        const actions: Record<string, string[]> = {
            emergency: ['撥打119', '分享位置', '查看避難所'],
            shelter: ['查看地圖', '導航前往', '查看容量'],
            status: ['重新整理', '訂閱通知', '查看詳情'],
            report: ['開始回報', '上傳照片', '分享位置'],
            general: ['查看狀態', '找避難所', '回報災情'],
        };
        return actions[intentType] || actions['general'];
    }
}

// Types
interface ConversationMessage { role: 'user' | 'assistant'; content: string; timestamp: Date; }
interface Intent { type: string; confidence: number; }
interface ChatResponse { sessionId: string; response: string; intent: string; suggestedActions: string[]; }
