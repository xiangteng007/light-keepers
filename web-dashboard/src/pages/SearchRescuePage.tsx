/**
 * SearchRescuePage.tsx
 * 
 * 搜救任務管理頁面 - 山搜/水域/城市倒塌搜救
 */
import './placeholder-pages.css';
import { AlertTriangle, MapPin, Users, Plus } from 'lucide-react';

export default function SearchRescuePage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🔍 搜救任務</h1>
            <p className="placeholder-page__subtitle">
                山搜、水域、城市倒塌結構救援任務管理
            </p>

            {/* 開發中提示 */}
            <div className="placeholder-page__dev-notice">
                <AlertTriangle size={20} color="#92400E" />
                <div>
                    <strong className="placeholder-page__dev-notice-title">🚧 功能開發中</strong>
                    <p className="placeholder-page__dev-notice-text">
                        搜救任務管理系統正在開發中，預計包含：任務建立、GPS 追蹤、人員調度、即時通訊等功能。
                    </p>
                </div>
            </div>

            <div className="placeholder-page__grid">
                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🏔️</div>
                    <div className="placeholder-page__card-value">3</div>
                    <div className="placeholder-page__card-label">進行中任務</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">👥</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--blue">24</div>
                    <div className="placeholder-page__card-label">出勤人員</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">✅</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--green">12</div>
                    <div className="placeholder-page__card-label">已救援</div>
                </div>
            </div>

            {/* 預期功能區塊 */}
            <div className="placeholder-page__expected-features">
                <h3 className="placeholder-page__expected-features-title">
                    📋 預期功能
                </h3>
                <div className="placeholder-page__grid">
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <MapPin size={24} color="#3B82F6" />
                        <div className="placeholder-page__feature-card-title">任務地圖</div>
                        <div className="placeholder-page__card-label">即時搜救範圍與人員位置</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Users size={24} color="#8B5CF6" />
                        <div className="placeholder-page__feature-card-title">人員調度</div>
                        <div className="placeholder-page__card-label">搜救小隊分配與追蹤</div>
                    </div>
                    <div className="placeholder-page__card placeholder-page__feature-card">
                        <Plus size={24} color="#10B981" />
                        <div className="placeholder-page__feature-card-title">新增任務</div>
                        <div className="placeholder-page__card-label">快速建立搜救任務</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

