/**
 * PFAChatbot.tsx
 * 
 * Psychological First Aid (PFA) AI Chatbot interface
 */
import React, { useState, useRef, useEffect } from 'react';
import { SupportIcon, InfoIcon, SosIcon } from '../../design-system/icons';
import './PFAChatbot.css';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sentiment?: { score: number; label: string };
}

interface PFAChatbotProps {
    onSendMessage: (message: string) => Promise<{ response: string; sentiment?: { score: number; label: string } }>;
}

const INITIAL_MESSAGE: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: '您好！我是心理急救助理 🌱\n\n我在這裡傾聽您的心聲。無論是災害後的壓力、工作疲憊，或只是需要有人說說話，我都願意陪伴您。\n\n現在，您想聊些什麼呢？',
    timestamp: new Date(),
};

const QUICK_PROMPTS = [
    '我感到很焦慮',
    '我睡不好',
    '我需要放鬆技巧',
    '我想談談今天的任務',
];

export function PFAChatbot({ onSendMessage }: PFAChatbotProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await onSendMessage(messageText);

            const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: result.response,
                timestamp: new Date(),
                sentiment: result.sentiment,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: '抱歉，發生了一些問題。請稍後再試，或撥打 1925 安心專線與專人聯繫。',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="pfa-chatbot">
            <div className="pfa-chatbot__header">
                <div className="chatbot-avatar" aria-hidden="true"><SupportIcon size={20} /></div>
                <div className="chatbot-info">
                    <h3>心理急救助理</h3>
                    <span className="chatbot-status">● 隨時在線</span>
                </div>
            </div>

            <div className="pfa-chatbot__messages">
                {messages.map(msg => (
                    <div key={msg.id} className={`message message--${msg.role}`}>
                        <div className="message__content">
                            {msg.content.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    {i < msg.content.split('\n').length - 1 && <br />}
                                </React.Fragment>
                            ))}
                        </div>
                        {msg.sentiment && (
                            <div className="message__sentiment">
                                情緒分析: {msg.sentiment.label} ({msg.sentiment.score.toFixed(2)})
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="message message--assistant">
                        <div className="message__content typing">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length === 1 && (
                <div className="pfa-chatbot__quick">
                    {QUICK_PROMPTS.map((prompt, i) => (
                        <button
                            key={i}
                            className="quick-btn"
                            onClick={() => handleSend(prompt)}
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            <div className="pfa-chatbot__input">
                <textarea
                    placeholder="輸入您想說的話..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    rows={1}
                />
                <button
                    className="send-btn"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                >
                    發送
                </button>
            </div>

            <div className="pfa-chatbot__footer">
                <p><InfoIcon size={16} aria-hidden="true" /> 此為 AI 輔助工具，無法取代專業心理諮詢</p>
                <p><SosIcon size={16} aria-hidden="true" /> 緊急求助：<a href="tel:1925">1925 安心專線</a></p>
            </div>
        </div>
    );
}
