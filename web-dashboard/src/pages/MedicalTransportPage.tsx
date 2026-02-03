/**
 * MedicalTransportPage.tsx
 * 
 * 醫療後送頁面 - MCI/檢傷/後送管理
 */
import './placeholder-pages.css';

export default function MedicalTransportPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🚑 醫療後送</h1>
            <p className="placeholder-page__subtitle">
                大量傷患事件處理、檢傷分類、後送調度
            </p>

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
        </div>
    );
}
