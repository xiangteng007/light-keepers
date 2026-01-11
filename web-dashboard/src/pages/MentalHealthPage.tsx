/**
 * MentalHealthPage.tsx
 * 
 * Mental health support and self-assessment page
 * Features: Mood tracking, PHQ-9/GAD-7 questionnaires, Blessing wall, AI chatbot
 */
import React, { useState, useEffect } from 'react';
import {
    MoodSelector,
    PHQ9Questionnaire,
    GAD7Questionnaire,
    BlessingWall,
    PFAChatbot,
} from '../components/mental-health';
import './MentalHealthPage.css';

type TabType = 'mood' | 'phq9' | 'gad7' | 'blessing' | 'chat';

// Mock data - will be replaced with API calls
const mockBlessings = [
    { id: '1', displayName: '志工小明', message: '願災區平安，大家加油！', iconType: 'candle', likes: 12, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', displayName: '匿名', message: '祝福所有救災人員平安歸來 🙏', iconType: 'prayer', likes: 8, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: '3', displayName: '小美', message: '希望受災民眾能早日重建家園', iconType: 'rainbow', likes: 15, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

export default function MentalHealthPage() {
    const [activeTab, setActiveTab] = useState<TabType>('mood');
    const [blessings, setBlessings] = useState(mockBlessings);
    const [moodHistory, setMoodHistory] = useState<{ date: string; score: number }[]>([]);

    // Handlers
    const handleMoodSubmit = async (score: number, note: string, tags: string[]) => {
        console.log('Mood submitted:', { score, note, tags });
        // TODO: Call API
        const newEntry = { date: new Date().toISOString(), score };
        setMoodHistory(prev => [...prev, newEntry]);
        alert('心情已記錄！感謝您的分享 💛');
    };

    const handlePHQ9Complete = (score: number, answers: number[]) => {
        console.log('PHQ-9 completed:', { score, answers });
        // TODO: Save to backend
    };

    const handleGAD7Complete = (score: number, answers: number[]) => {
        console.log('GAD-7 completed:', { score, answers });
        // TODO: Save to backend
    };

    const handlePostBlessing = async (message: string, iconType: string) => {
        const newBlessing = {
            id: `temp-${Date.now()}`,
            displayName: '我', // TODO: Get from auth
            message,
            iconType,
            likes: 0,
            createdAt: new Date().toISOString(),
        };
        setBlessings(prev => [newBlessing, ...prev]);
        // TODO: Call API
    };

    const handleLikeBlessing = (id: string) => {
        setBlessings(prev => prev.map(b =>
            b.id === id ? { ...b, likes: b.likes + 1 } : b
        ));
        // TODO: Call API
    };

    const handleChatMessage = async (message: string) => {
        // TODO: Call PFA Chatbot API
        // Mock response for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            response: getAIResponse(message),
            sentiment: { score: 0.6, label: '中性' },
        };
    };

    return (
        <div className="mental-health-page">
            {/* Header */}
            <div className="mh-header">
                <h1>🌱 心理健康中心</h1>
                <p>照顧好自己，才能更好地幫助他人</p>
            </div>

            {/* Hotline Banner */}
            <div className="mh-hotline">
                <span>🆘 需要幫助嗎？</span>
                <a href="tel:1925">1925 安心專線</a>
                <span>24小時免費專人服務</span>
            </div>

            {/* Tabs */}
            <div className="mh-tabs">
                <button
                    className={`mh-tab ${activeTab === 'mood' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mood')}
                >
                    😊 心情記錄
                </button>
                <button
                    className={`mh-tab ${activeTab === 'phq9' ? 'active' : ''}`}
                    onClick={() => setActiveTab('phq9')}
                >
                    📋 憂鬱評估
                </button>
                <button
                    className={`mh-tab ${activeTab === 'gad7' ? 'active' : ''}`}
                    onClick={() => setActiveTab('gad7')}
                >
                    📋 焦慮評估
                </button>
                <button
                    className={`mh-tab ${activeTab === 'blessing' ? 'active' : ''}`}
                    onClick={() => setActiveTab('blessing')}
                >
                    🕯️ 祈福牆
                </button>
                <button
                    className={`mh-tab ${activeTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chat')}
                >
                    💬 聊聊
                </button>
            </div>

            {/* Content */}
            <div className="mh-content">
                {activeTab === 'mood' && (
                    <div className="mh-section">
                        <MoodSelector onSubmit={handleMoodSubmit} />

                        {/* Quick Resources */}
                        <div className="mh-resources">
                            <h4>🌿 自我照顧資源</h4>
                            <div className="resource-grid">
                                <a href="#" className="resource-card">
                                    <span>🧘</span>
                                    <span>呼吸放鬆</span>
                                </a>
                                <a href="#" className="resource-card">
                                    <span>🎵</span>
                                    <span>舒壓音樂</span>
                                </a>
                                <a href="#" className="resource-card">
                                    <span>📖</span>
                                    <span>正念練習</span>
                                </a>
                                <a href="#" className="resource-card">
                                    <span>💤</span>
                                    <span>睡眠指南</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'phq9' && (
                    <PHQ9Questionnaire onComplete={handlePHQ9Complete} />
                )}

                {activeTab === 'gad7' && (
                    <GAD7Questionnaire onComplete={handleGAD7Complete} />
                )}

                {activeTab === 'blessing' && (
                    <BlessingWall
                        blessings={blessings}
                        onPostBlessing={handlePostBlessing}
                        onLikeBlessing={handleLikeBlessing}
                    />
                )}

                {activeTab === 'chat' && (
                    <PFAChatbot onSendMessage={handleChatMessage} />
                )}
            </div>
        </div>
    );
}

// Simple AI response generator (mock)
function getAIResponse(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('焦慮') || lower.includes('緊張')) {
        return '我聽到了您的感受。焦慮是在壓力下很正常的反應。\n\n試試這個簡單的呼吸練習：\n1. 慢慢吸氣 4 秒\n2. 屏住呼吸 4 秒\n3. 慢慢呼氣 6 秒\n4. 重複 3-5 次\n\n這個方法可以幫助您的身體放鬆。現在感覺如何？';
    }

    if (lower.includes('睡不好') || lower.includes('失眠')) {
        return '睡眠問題確實很困擾。以下是一些可能有幫助的建議：\n\n• 維持規律的作息時間\n• 睡前 1 小時避免使用手機\n• 避免晚間攝取咖啡因\n• 保持臥室涼爽、安靜\n\n如果問題持續超過兩週，建議諮詢醫師。您願意分享更多嗎？';
    }

    if (lower.includes('任務') || lower.includes('工作') || lower.includes('疲憊')) {
        return '救災工作確實非常辛苦。您願意為大家付出，這份心意很珍貴。\n\n但請記得，照顧好自己才能更好地幫助他人。💛\n\n您最近有足夠的休息嗎？';
    }

    if (lower.includes('放鬆')) {
        return '很高興您想學習放鬆技巧！這裡有幾個簡單的方法：\n\n🧘 *身體掃描*\n從頭頂到腳趾，慢慢感受每個部位，放鬆緊繃的肌肉。\n\n🌊 *想像練習*\n閉上眼睛，想像自己在平靜的海邊或森林中。\n\n🎵 *聽音樂*\n播放輕柔的音樂，讓思緒隨著旋律飄動。\n\n您想試試哪一個？';
    }

    return '謝謝您願意分享。我在這裡傾聽。\n\n可以告訴我更多嗎？無論是您的感受、今天發生的事，或任何您想聊的話題，我都願意聆聽。';
}
