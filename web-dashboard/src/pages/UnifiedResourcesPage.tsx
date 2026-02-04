/**
 * UnifiedResourcesPage.tsx
 * 
 * 資源整合頁面 - 跨組織資源協調
 */
import './placeholder-pages.css';
import { AlertTriangle, Package, Building, Truck } from 'lucide-react';

export default function UnifiedResourcesPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🔗 資源整合</h1>
            <p className="placeholder-page__subtitle">
                跨組織物資協調、資源共享、整合調度
            </p>

            {/* 開發中提示 */}
            <div className="placeholder-page__dev-notice" style={{
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                border: '1px solid #F59E0B',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <AlertTriangle size={20} color="#92400E" />
                <div>
                    <strong style={{ color: '#92400E' }}>🚧 功能開發中</strong>
                    <p style={{ margin: '4px 0 0', color: '#78350F', fontSize: '14px' }}>
                        資源整合系統正在開發中，預計包含：跨組織庫存共享、智慧資源匹配、即時調撥追蹤等功能。
                    </p>
                </div>
            </div>

            <div className="placeholder-page__grid">
                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🏢</div>
                    <div className="placeholder-page__card-value">6</div>
                    <div className="placeholder-page__card-label">合作組織</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📦</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--blue">1,240</div>
                    <div className="placeholder-page__card-label">共享物資項</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🚚</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--green">15</div>
                    <div className="placeholder-page__card-label">調撥進行中</div>
                </div>
            </div>

            {/* 預期功能區塊 */}
            <div style={{ marginTop: '32px' }}>
                <h3 style={{ color: 'var(--primary, #001F3F)', marginBottom: '16px', fontSize: '18px' }}>
                    📋 預期功能
                </h3>
                <div className="placeholder-page__grid">
                    <div className="placeholder-page__card" style={{ opacity: 0.6 }}>
                        <Package size={24} color="#3B82F6" />
                        <div style={{ marginTop: '12px', fontWeight: 600 }}>共享庫存</div>
                        <div className="placeholder-page__card-label">跨組織物資可見度</div>
                    </div>
                    <div className="placeholder-page__card" style={{ opacity: 0.6 }}>
                        <Building size={24} color="#8B5CF6" />
                        <div style={{ marginTop: '12px', fontWeight: 600 }}>組織管理</div>
                        <div className="placeholder-page__card-label">合作夥伴設定</div>
                    </div>
                    <div className="placeholder-page__card" style={{ opacity: 0.6 }}>
                        <Truck size={24} color="#10B981" />
                        <div style={{ marginTop: '12px', fontWeight: 600 }}>調撥追蹤</div>
                        <div className="placeholder-page__card-label">即時物資移動狀態</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

