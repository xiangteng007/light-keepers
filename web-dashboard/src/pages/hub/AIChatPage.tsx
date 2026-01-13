/**
 * AIChatPage
 * Chatbot assistant powered by Gemini
 */
import { useState, useRef, useEffect } from 'react';
import './AIChatPage.css';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    suggestions?: string[];
}

export default function AIChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: '你好！我是光守護者 AI 助手 🤖\n\n我可以協助你：\n• 查詢災情狀況\n• 提供災害應變建議\n• 協助派遣志工和調度資源\n• 回答平台功能問題\n\n請問有什麼我可以幫忙的嗎？',
            timestamp: new Date(),
            suggestions: ['查看最新警報', '今天天氣如何？', '目前有哪些待處理任務？'],
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI response
        setTimeout(() => {
            const aiResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: getAIResponse(input),
                timestamp: new Date(),
                suggestions: ['繼續詢問', '查看任務', '返回首頁'],
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsLoading(false);
        }, 1500);
    };

    const getAIResponse = (question: string): string => {
        const lower = question.toLowerCase();
        if (lower.includes('天氣') || lower.includes('氣象')) {
            return '📊 目前台北地區天氣狀況：\n\n• 溫度：25°C\n• 濕度：75%\n• 天氣：多雲\n• 降雨機率：40%\n\n未來 6 小時有降雨可能，建議密切關注氣象預報。';
        }
        if (lower.includes('警報') || lower.includes('警示')) {
            return '🚨 目前有 2 則生效警報：\n\n1. 豪雨特報（黃色）- 北部地區\n2. 土石流警戒（紅色）- 新北市山區\n\n建議避免前往山區，並注意低窪地區積水。';
        }
        if (lower.includes('任務')) {
            return '📋 目前待處理任務：\n\n1. 緊急救援 - 北區淹水救援（高優先）\n2. 物資運送 - 物資站補給（中優先）\n3. 道路巡查 - 山區道路檢查（低優先）\n\n共 3 項待處理，需要我幫您接受任務嗎？';
        }
        return `收到您的問題：「${question}」\n\n我正在處理中，請稍候...目前此功能使用模擬回應，實際連接 Gemini API 後將提供更準確的回答。`;
    };

    const handleSuggestion = (suggestion: string) => {
        setInput(suggestion);
    };

    return (
        <div className="ai-chat-page">
            <header className="ai-chat-page__header">
                <h1>🤖 AI 助手</h1>
                <span className="status-badge">Gemini Pro</span>
            </header>

            <div className="ai-chat-page__messages">
                {messages.map(msg => (
                    <div key={msg.id} className={`message message--${msg.role}`}>
                        <div className="message__avatar">
                            {msg.role === 'assistant' ? '🤖' : '👤'}
                        </div>
                        <div className="message__content">
                            <p>{msg.content}</p>
                            <span className="message__time">
                                {msg.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.suggestions && (
                                <div className="message__suggestions">
                                    {msg.suggestions.map((s, i) => (
                                        <button key={i} onClick={() => handleSuggestion(s)}>{s}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message message--assistant">
                        <div className="message__avatar">🤖</div>
                        <div className="message__content">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="ai-chat-page__input">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                    placeholder="輸入問題..."
                    disabled={isLoading}
                />
                <button onClick={handleSend} disabled={isLoading || !input.trim()}>
                    發送
                </button>
            </div>
        </div>
    );
}
