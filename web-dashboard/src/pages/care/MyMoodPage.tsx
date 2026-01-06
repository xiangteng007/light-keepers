/**
 * 心情日記頁面 (My Mood Page)
 * 模組 C 前端：心情追蹤與 AI 陪伴
 */

import React, { useState, useEffect, useRef } from 'react';
import './MyMoodPage.css';

interface MoodLog {
    id: string;
    score: number;
    tags: string[];
    note: string;
    createdAt: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface MoodSummary {
    currentScore: number;
    weeklyAverage: number;
    trend: 'improving' | 'stable' | 'declining';
    alertLevel: string;
    recentTags: string[];
}

const MOOD_TAGS = [
    { id: 'fatigue', label: '疲勞', emoji: '😴' },
    { id: 'sadness', label: '悲傷', emoji: '😢' },
    { id: 'anxiety', label: '焦慮', emoji: '😰' },
    { id: 'anger', label: '憤怒', emoji: '😤' },
    { id: 'calm', label: '平靜', emoji: '😌' },
    { id: 'hopeful', label: '希望', emoji: '🌟' },
    { id: 'grateful', label: '感恩', emoji: '🙏' },
    { id: 'overwhelmed', label: '不堪負荷', emoji: '😵' },
];

const MyMoodPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tracker' | 'chat' | 'history'>('tracker');
    const [moodScore, setMoodScore] = useState(5);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [note, setNote] = useState('');
    const [summary, setSummary] = useState<MoodSummary | null>(null);
    const [history, setHistory] = useState<MoodLog[]>([]);

    // Chat state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const sessionId = useRef(`session-${Date.now()}`);

    const userId = localStorage.getItem('userId') || 'demo-user';

    useEffect(() => {
        loadMoodSummary();
        loadHistory();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMoodSummary = async () => {
        try {
            const response = await fetch(`/api/care/mood/summary/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setSummary(data.data);
            }
        } catch (error) {
            console.error('Failed to load summary:', error);
        }
    };

    const loadHistory = async () => {
        try {
            const response = await fetch(`/api/care/mood/history/${userId}?days=30`);
            if (response.ok) {
                const data = await response.json();
                setHistory(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    };

    const submitMood = async () => {
        try {
            const response = await fetch('/api/care/mood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    score: moodScore,
                    tags: selectedTags,
                    note,
                }),
            });

            if (response.ok) {
                alert('心情已記錄 💙');
                setMoodScore(5);
                setSelectedTags([]);
                setNote('');
                loadMoodSummary();
                loadHistory();
            }
        } catch (error) {
            console.error('Failed to submit mood:', error);
        }
    };

    const startNewChat = async () => {
        try {
            const response = await fetch('/api/care/chat/new-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sessionId.current }),
            });

            if (response.ok) {
                const data = await response.json();
                setMessages([{
                    role: 'assistant',
                    content: data.data.greeting,
                    timestamp: new Date(),
                }]);
            }
        } catch (error) {
            console.error('Failed to start chat:', error);
        }
    };

    const sendMessage = async () => {
        if (!chatInput.trim() || chatLoading) return;

        const userMessage = chatInput;
        setChatInput('');
        setChatLoading(true);

        setMessages(prev => [...prev, {
            role: 'user',
            content: userMessage,
            timestamp: new Date(),
        }]);

        try {
            const response = await fetch('/api/care/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    sessionId: sessionId.current,
                    message: userMessage,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.data.response,
                    timestamp: new Date(),
                }]);

                // 如果有危機資源
                if (data.data.resources) {
                    setTimeout(() => {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: data.data.resources.join('\n'),
                            timestamp: new Date(),
                        }]);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setChatLoading(false);
        }
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(t => t !== tagId)
                : [...prev, tagId]
        );
    };

    const getMoodEmoji = (score: number) => {
        if (score <= 2) return '😢';
        if (score <= 4) return '😔';
        if (score <= 6) return '😐';
        if (score <= 8) return '🙂';
        return '😊';
    };

    const getTrendIcon = (trend: string) => {
        if (trend === 'improving') return '📈';
        if (trend === 'declining') return '📉';
        return '➡️';
    };

    return (
        <div className="my-mood-page">
            <header className="mood-header">
                <h1>💙 我的心情</h1>
                <p>照顧自己，也是一種力量</p>
            </header>

            {/* 心情摘要 */}
            {summary && (
                <div className="mood-summary">
                    <div className="summary-item">
                        <span className="summary-emoji">{getMoodEmoji(summary.currentScore)}</span>
                        <span className="summary-label">現在</span>
                        <span className="summary-value">{summary.currentScore}/10</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-emoji">{getTrendIcon(summary.trend)}</span>
                        <span className="summary-label">趨勢</span>
                        <span className="summary-value">
                            {summary.trend === 'improving' ? '好轉' :
                                summary.trend === 'declining' ? '下降' : '穩定'}
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-emoji">📊</span>
                        <span className="summary-label">週平均</span>
                        <span className="summary-value">{summary.weeklyAverage}</span>
                    </div>
                </div>
            )}

            {/* 標籤頁 */}
            <div className="mood-tabs">
                <button
                    className={activeTab === 'tracker' ? 'active' : ''}
                    onClick={() => setActiveTab('tracker')}
                >
                    📝 記錄心情
                </button>
                <button
                    className={activeTab === 'chat' ? 'active' : ''}
                    onClick={() => { setActiveTab('chat'); if (messages.length === 0) startNewChat(); }}
                >
                    💬 聊聊天
                </button>
                <button
                    className={activeTab === 'history' ? 'active' : ''}
                    onClick={() => setActiveTab('history')}
                >
                    📅 歷史
                </button>
            </div>

            {/* 記錄心情 */}
            {activeTab === 'tracker' && (
                <div className="tracker-section">
                    <div className="score-picker">
                        <h3>現在的心情如何？</h3>
                        <div className="score-display">
                            <span className="score-emoji">{getMoodEmoji(moodScore)}</span>
                            <span className="score-value">{moodScore}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={moodScore}
                            onChange={e => setMoodScore(parseInt(e.target.value))}
                            className="score-slider"
                        />
                        <div className="score-labels">
                            <span>很差</span>
                            <span>普通</span>
                            <span>很好</span>
                        </div>
                    </div>

                    <div className="tags-picker">
                        <h3>有什麼特別的感受？</h3>
                        <div className="tags-grid">
                            {MOOD_TAGS.map(tag => (
                                <button
                                    key={tag.id}
                                    className={`tag-btn ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                                    onClick={() => toggleTag(tag.id)}
                                >
                                    {tag.emoji} {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="note-input">
                        <h3>想寫點什麼嗎？（選填）</h3>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="今天發生了什麼..."
                            rows={3}
                        />
                    </div>

                    <button className="submit-btn" onClick={submitMood}>
                        💙 記錄心情
                    </button>
                </div>
            )}

            {/* AI 聊天 */}
            {activeTab === 'chat' && (
                <div className="chat-section">
                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`chat-message ${msg.role}`}>
                                {msg.role === 'assistant' && <span className="bot-avatar">🤖</span>}
                                <div className="message-content">
                                    {msg.content.split('\n').map((line, i) => (
                                        <p key={i}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="chat-message assistant">
                                <span className="bot-avatar">🤖</span>
                                <div className="message-content typing">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="chat-input-area">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && sendMessage()}
                            placeholder="說說你的想法..."
                            disabled={chatLoading}
                        />
                        <button onClick={sendMessage} disabled={chatLoading}>
                            發送
                        </button>
                    </div>
                </div>
            )}

            {/* 歷史記錄 */}
            {activeTab === 'history' && (
                <div className="history-section">
                    {history.length === 0 ? (
                        <div className="empty-history">
                            <span>📭</span>
                            <p>還沒有記錄</p>
                        </div>
                    ) : (
                        <div className="history-list">
                            {history.map(log => (
                                <div key={log.id} className="history-item">
                                    <div className="history-score">
                                        {getMoodEmoji(log.score)}
                                        <span>{log.score}/10</span>
                                    </div>
                                    <div className="history-content">
                                        {log.tags?.length > 0 && (
                                            <div className="history-tags">
                                                {log.tags.map(t => (
                                                    <span key={t}>{t}</span>
                                                ))}
                                            </div>
                                        )}
                                        {log.note && <p>{log.note}</p>}
                                    </div>
                                    <div className="history-time">
                                        {new Date(log.createdAt).toLocaleDateString('zh-TW')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyMoodPage;
