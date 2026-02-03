/**
 * UnifiedResourcesPage.tsx
 * 
 * 資源整合頁面 - 跨組織資源協調
 */
import './placeholder-pages.css';

export default function UnifiedResourcesPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🔗 資源整合</h1>
            <p className="placeholder-page__subtitle">
                跨組織物資協調、資源共享、整合調度
            </p>

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
        </div>
    );
}
