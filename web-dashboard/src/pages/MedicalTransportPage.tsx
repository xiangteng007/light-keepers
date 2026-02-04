/**
 * MedicalTransportPage.tsx
 * 
 * 醫療後送頁面 - MCI/檢傷/後送管理
 */
import './placeholder-pages.css';
import { AlertTriangle, Ambulance, ClipboardList, MapPin } from 'lucide-react';

export default function MedicalTransportPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🚑 醫療後送</h1>
            <p className="placeholder-page__subtitle">
                大量傷患事件處理、檢傷分類、後送調度
            </p>

            {/* 開發中提示 */}
            <div className="placeholder-page__dev-notice">
                <AlertTriangle size={20} color="#92400E" />
                <div>
                    <strong className="placeholder-page__dev-notice-title">🚧 功能開發中</strong>
                    <p className="placeholder-page__dev-notice-text">
                        醫療後送系統正在開發中，預計包含：START 檢傷分類、後送車輛調度、醫院容量查詢等功能。
                    </p>
                </div>
            </div>

            <div className="placeholder-page__triage-grid">
                <div className="placeholder-page__triage-card placeholder-page__triage-card--red">
                    <div className="placeholder-page__triage-label">🔴 紅色-危急</div>
                    <div className="placeholder-page__triage-value">2</div>
                </div>

                <div className="placeholder-page__triage-card placeholder-page__triage-card--orange">
                    <div className="placeholder-page__triage-label">🟠 黃色-中傷</div>
                    <div className="placeholder-page__triage-value">5</div>
                </div>

                <div className="placeholder-page__triage-card placeholder-page__triage-card--green">
                    <div className="placeholder-page__triage-label">🟢 綠色-輕傷</div>
                    <div className="placeholder-page__triage-value">15</div>
                </div>

                <div className="placeholder-page__triage-card placeholder-page__triage-card--black">
                    <div className="placeholder-page__triage-label">⚫ 黑色-不治</div>
                    <div className="placeholder-page__triage-value">0</div>
                </div>
            </div>

            {/* 預期功能區塊 */}
            <div className="placeholder-page__expected-features">
                <h3 className="placeholder-page__expected-features-title">
                    📋 預期功能
                </h3>
                <div className="placeholder-page__grid">
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <ClipboardList size={24} color="#DC2626" />
                        <div className="placeholder-page__feature-card-title">檢傷分類</div>
                        <div className="placeholder-page__card-label">START 快速檢傷系統</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Ambulance size={24} color="#3B82F6" />
                        <div className="placeholder-page__feature-card-title">車輛調度</div>
                        <div className="placeholder-page__card-label">救護車即時狀態與指派</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <MapPin size={24} color="#10B981" />
                        <div className="placeholder-page__feature-card-title">醫院導航</div>
                        <div className="placeholder-page__card-label">鄰近醫院容量與路線</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

