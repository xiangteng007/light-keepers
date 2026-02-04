/**
 * SimulationPage.tsx
 * 
 * 模擬引擎頁面 - 災害模擬與推演
 */
import './placeholder-pages.css';
import { AlertTriangle, Play, Settings, BarChart3 } from 'lucide-react';

export default function SimulationPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🧪 模擬引擎</h1>
            <p className="placeholder-page__subtitle">
                災害情境模擬、桌上推演、能力評核
            </p>

            {/* 開發中提示 */}
            <div className="placeholder-page__dev-notice placeholder-page__dev-notice--purple">
                <AlertTriangle size={20} color="#7C3AED" />
                <div>
                    <strong className="placeholder-page__dev-notice-title">🚧 模擬功能開發中</strong>
                    <p className="placeholder-page__dev-notice-text">
                        災害模擬引擎正在開發中，預計包含：洪水範圍預估、地震損害評估、桌上推演設計器等功能。
                    </p>
                </div>
            </div>

            <div className="placeholder-page__grid">
                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🌊</div>
                    <div className="placeholder-page__card-title">水災模擬</div>
                    <div className="placeholder-page__card-label">淹水範圍預估</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🏔️</div>
                    <div className="placeholder-page__card-title">土石流模擬</div>
                    <div className="placeholder-page__card-label">潛勢區預警</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🏢</div>
                    <div className="placeholder-page__card-title">地震模擬</div>
                    <div className="placeholder-page__card-label">結構損壞評估</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📋</div>
                    <div className="placeholder-page__card-title">桌上推演</div>
                    <div className="placeholder-page__card-label">情境演練設計</div>
                </div>
            </div>

            {/* 預期功能區塊 */}
            <div className="placeholder-page__expected-features">
                <h3 className="placeholder-page__expected-features-title">
                    📋 預期功能
                </h3>
                <div className="placeholder-page__grid">
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Play size={24} color="#10B981" />
                        <div className="placeholder-page__feature-card-title">情境執行</div>
                        <div className="placeholder-page__card-label">即時模擬執行與暫停</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Settings size={24} color="#6B7280" />
                        <div className="placeholder-page__feature-card-title">參數調校</div>
                        <div className="placeholder-page__card-label">災害強度與範圍設定</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <BarChart3 size={24} color="#3B82F6" />
                        <div className="placeholder-page__feature-card-title">結果分析</div>
                        <div className="placeholder-page__card-label">損失評估報告生成</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

