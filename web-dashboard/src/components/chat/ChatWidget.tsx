import React, { useState, useRef, useEffect } from 'react';
import './ChatWidget.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: '您好！我是光守護者 AI 助手，請問有什麼可以幫助您的？', timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // TODO: Call chatbot API
            const response = await new Promise<string>((resolve) => {
                setTimeout(() => {
                    if (input.includes('避難')) {
                        resolve('最近的避難所是中正區活動中心，距離約 1.2km。地址：台北市中正區xxx路xx號。');
                    } else if (input.includes('狀態')) {
                        resolve('目前系統運作正常，有 2 個進行中的事件，15 名志工在線。');
                    } else {
                        resolve('感謝您的詢問！如需更多協助，可以問我關於避難所、災情狀態或回報方式的問題。');
                    }
                }, 1000);
            });

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const suggestedQuestions = [
        '最近的避難所在哪裡？',
        '目前系統狀態如何？',
        '如何回報災情？'
    ];

    return (
        <div className="chat-widget-container">
            {isOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        <span className="chat-title">🤖 AI 助手</span>
                        <button className="chat-close" onClick={() => setIsOpen(false)}>✕</button>
                    </div>
                    <div className="chat-messages">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`chat-message ${msg.role}`}>
                                <div className="message-content">{msg.content}</div>
                                <div className="message-time">
                                    {msg.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-message assistant">
                                <div className="message-content typing">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    {messages.length <= 2 && (
                        <div className="suggested-questions">
                            {suggestedQuestions.map((q, i) => (
                                <button key={i} className="suggested-btn" onClick={() => { setInput(q); }}>
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="chat-input-area">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="輸入訊息..."
                            disabled={isLoading}
                        />
                        <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                            發送
                        </button>
                    </div>
                </div>
            )}
            <button className="chat-fab" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '✕' : '💬'}
            </button>
        </div>
    );
};

export default ChatWidget;
