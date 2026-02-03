/**
 * SearchRescuePage.tsx
 * 
 * 搜救任務管理頁面 - 山搜/水域/城市倒塌搜救
 */
import './placeholder-pages.css';

export default function SearchRescuePage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🔍 搜救任務</h1>
            <p className="placeholder-page__subtitle">
                山搜、水域、城市倒塌結構救援任務管理
            </p>

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
        </div>
    );
}
