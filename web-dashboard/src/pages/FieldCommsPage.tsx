/**
 * FieldCommsPage.tsx
 * 
 * 現地通訊頁面 - 無線電/弱網/衛星備援
 */
import './placeholder-pages.css';
import { AlertTriangle, Radio, Wifi, Satellite } from 'lucide-react';

export default function FieldCommsPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">📻 現地通訊</h1>
            <p className="placeholder-page__subtitle">
                無線電通訊、弱網環境、衛星備援通訊管理
            </p>

            {/* 開發中提示 */}
            <div className="placeholder-page__dev-notice">
                <AlertTriangle size={20} color="#92400E" />
                <div>
                    <strong className="placeholder-page__dev-notice-title">🚧 功能開發中</strong>
                    <p className="placeholder-page__dev-notice-text">
                        通訊系統正在開發中，預計包含：無線電頻道管理、衛星通訊備援、Mesh 網路狀態監控等功能。
                    </p>
                </div>
            </div>

            <div className="placeholder-page__grid">
                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📡</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--green">5/5</div>
                    <div className="placeholder-page__card-label">通訊頻道在線</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🛰️</div>
                    <div className="placeholder-page__card-value">備用</div>
                    <div className="placeholder-page__card-label">衛星通訊狀態</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📶</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--blue">85%</div>
                    <div className="placeholder-page__card-label">Mesh 網路覆蓋</div>
                </div>
            </div>

            {/* 預期功能區塊 */}
            <div className="placeholder-page__expected-features">
                <h3 className="placeholder-page__expected-features-title">
                    📋 預期功能
                </h3>
                <div className="placeholder-page__grid">
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Radio size={24} color="#DC2626" />
                        <div className="placeholder-page__feature-card-title">無線電管理</div>
                        <div className="placeholder-page__card-label">頻道分配與通話紀錄</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Wifi size={24} color="#3B82F6" />
                        <div className="placeholder-page__feature-card-title">Mesh 網路</div>
                        <div className="placeholder-page__card-label">節點狀態與拓撲圖</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Satellite size={24} color="#8B5CF6" />
                        <div className="placeholder-page__feature-card-title">衛星備援</div>
                        <div className="placeholder-page__card-label">Starlink / Iridium 整合</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

