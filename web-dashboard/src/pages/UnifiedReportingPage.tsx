/**
 * UnifiedReportingPage.tsx
 * 
 * 綜合報表頁面 - 跨領域報表生成
 */
import './placeholder-pages.css';

export default function UnifiedReportingPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">📊 綜合報表</h1>
            <p className="placeholder-page__subtitle">
                跨領域整合報表、SITREP、事件摘要
            </p>

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
        </div>
    );
}
