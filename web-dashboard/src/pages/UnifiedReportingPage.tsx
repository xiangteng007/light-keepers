/**
 * UnifiedReportingPage.tsx
 * 
 * 綜合報表頁面 - 跨領域報表生成
 */
import './placeholder-pages.css';
import { AlertTriangle, FileText, TrendingUp, Printer } from 'lucide-react';

export default function UnifiedReportingPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">📊 綜合報表</h1>
            <p className="placeholder-page__subtitle">
                跨領域整合報表、SITREP、事件摘要
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
                <AlertTriangle size={20} color="#1E40AF" />
                <div>
                    <strong style={{ color: '#1E40AF' }}>🚧 報表功能開發中</strong>
                    <p style={{ margin: '4px 0 0', color: '#1E3A8A', fontSize: '14px' }}>
                        綜合報表系統正在開發中，預計包含：SITREP 自動生成、AAR 範本、資料視覺化儀表板等功能。
                    </p>
                </div>
            </div>

            <div className="placeholder-page__grid">
                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📄</div>
                    <div className="placeholder-page__card-value">24</div>
                    <div className="placeholder-page__card-label">本月報表</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📋</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--blue">3</div>
                    <div className="placeholder-page__card-label">SITREP 進行中</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📈</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--green">8</div>
                    <div className="placeholder-page__card-label">AAR 已完成</div>
                </div>
            </div>

            {/* 預期功能區塊 */}
            <div style={{ marginTop: '32px' }}>
                <h3 style={{ color: 'var(--primary, #001F3F)', marginBottom: '16px', fontSize: '18px' }}>
                    📋 預期功能
                </h3>
                <div className="placeholder-page__grid">
                    <div className="placeholder-page__card" style={{ opacity: 0.6 }}>
                        <FileText size={24} color="#DC2626" />
                        <div style={{ marginTop: '12px', fontWeight: 600 }}>SITREP 生成</div>
                        <div className="placeholder-page__card-label">自動化情況報告</div>
                    </div>
                    <div className="placeholder-page__card" style={{ opacity: 0.6 }}>
                        <TrendingUp size={24} color="#3B82F6" />
                        <div style={{ marginTop: '12px', fontWeight: 600 }}>趨勢分析</div>
                        <div className="placeholder-page__card-label">歷史資料對比</div>
                    </div>
                    <div className="placeholder-page__card" style={{ opacity: 0.6 }}>
                        <Printer size={24} color="#10B981" />
                        <div style={{ marginTop: '12px', fontWeight: 600 }}>報表輸出</div>
                        <div className="placeholder-page__card-label">PDF / Excel 匯出</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

