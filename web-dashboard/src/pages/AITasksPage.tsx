/**
 * AITasksPage.tsx
 * 
 * AI 任務頁面 - AI 自動化任務管理
 */
import './placeholder-pages.css';
import { Bot, Zap, Brain } from 'lucide-react';

export default function AITasksPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🤖 AI 任務</h1>
            <p className="placeholder-page__subtitle">
                AI 自動化任務排程與執行監控
            </p>

            {/* 開發中提示 */}
            <div className="placeholder-page__dev-notice" style={{
                background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
                border: '1px solid #3B82F6',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <Bot size={20} color="#1E40AF" />
                <div>
                    <strong style={{ color: '#1E40AF' }}>🚧 AI 功能開發中</strong>
                    <p style={{ margin: '4px 0 0', color: '#1E3A8A', fontSize: '14px' }}>
                        AI 自動化系統正在開發中，預計包含：智能排班、資源匹配、情報摘要、預測分析等功能。
                    </p>
                </div>
            </div>

            <div className="placeholder-page__grid">
                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📊</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--green">8</div>
                    <div className="placeholder-page__card-label">已完成任務</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">⏳</div>
                    <div className="placeholder-page__card-value">3</div>
                    <div className="placeholder-page__card-label">執行中</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📋</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--blue">12</div>
                    <div className="placeholder-page__card-label">排程中</div>
                </div>
            </div>

            {/* 預期功能區塊 */}
            <div style={{ marginTop: '32px' }}>
                <h3 style={{ color: 'var(--primary, #001F3F)', marginBottom: '16px', fontSize: '18px' }}>
                    📋 預期 AI 功能
                </h3>
                <div className="placeholder-page__grid">
                    <div className="placeholder-page__card" style={{ opacity: 0.6 }}>
                        <Zap size={24} color="#F59E0B" />
                        <div style={{ marginTop: '12px', fontWeight: 600 }}>智能排班</div>
                        <div className="placeholder-page__card-label">自動最佳化人員調度</div>
                    </div>
                    <div className="placeholder-page__card" style={{ opacity: 0.6 }}>
                        <Brain size={24} color="#8B5CF6" />
                        <div style={{ marginTop: '12px', fontWeight: 600 }}>情報摘要</div>
                        <div className="placeholder-page__card-label">自動生成 SITREP 報告</div>
                    </div>
                    <div className="placeholder-page__card" style={{ opacity: 0.6 }}>
                        <Bot size={24} color="#10B981" />
                        <div style={{ marginTop: '12px', fontWeight: 600 }}>資源匹配</div>
                        <div className="placeholder-page__card-label">需求與供給智能配對</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

