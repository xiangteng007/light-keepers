/**
 * InteroperabilityPage.tsx
 * 
 * 機構互通頁面 - 跨組織資料交換
 */
import './placeholder-pages.css';
import { AlertTriangle, Link, Database, RefreshCw } from 'lucide-react';

export default function InteroperabilityPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🔄 機構互通</h1>
            <p className="placeholder-page__subtitle">
                OCHA EDXL、EMAP 標準、跨機關資料交換
            </p>

            {/* 開發中提示 */}
            <div className="placeholder-page__dev-notice placeholder-page__dev-notice--green">
                <AlertTriangle size={20} color="#047857" />
                <div>
                    <strong style={{ color: '#047857' }}>🚧 互通功能開發中</strong>
                    <p style={{ margin: '4px 0 0', color: '#065F46', fontSize: '14px' }}>
                        機構互通系統正在開發中，預計包含：EDXL 訊息發送、EMAP 標準對接、API 管理介面等功能。
                    </p>
                </div>
            </div>

            <div className="placeholder-page__grid">
                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🌐</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--green">4</div>
                    <div className="placeholder-page__card-label">已連接機構</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📤</div>
                    <div className="placeholder-page__card-value">156</div>
                    <div className="placeholder-page__card-label">今日訊息</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">✅</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--blue">99.2%</div>
                    <div className="placeholder-page__card-label">同步成功率</div>
                </div>
            </div>

            {/* 預期功能區塊 */}
            <div className="placeholder-page__expected-features">
                <h3 className="placeholder-page__expected-features-title">
                    📋 預期功能
                </h3>
                <div className="placeholder-page__grid">
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Link size={24} color="#3B82F6" />
                        <div className="placeholder-page__feature-card-title">API 管理</div>
                        <div className="placeholder-page__card-label">外部系統連接設定</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Database size={24} color="#8B5CF6" />
                        <div className="placeholder-page__feature-card-title">EDXL 訊息</div>
                        <div className="placeholder-page__card-label">標準化災害訊息交換</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <RefreshCw size={24} color="#10B981" />
                        <div className="placeholder-page__feature-card-title">資料同步</div>
                        <div className="placeholder-page__card-label">即時同步狀態監控</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

