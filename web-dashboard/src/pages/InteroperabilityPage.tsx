/**
 * InteroperabilityPage.tsx
 * 
 * 機構互通頁面 - 跨組織資料交換
 */
import './placeholder-pages.css';

export default function InteroperabilityPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🔄 機構互通</h1>
            <p className="placeholder-page__subtitle">
                OCHA EDXL、EMAP 標準、跨機關資料交換
            </p>

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
        </div>
    );
}
