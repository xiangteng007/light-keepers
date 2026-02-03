/**
 * SimulationPage.tsx
 * 
 * 模擬引擎頁面 - 災害模擬與推演
 */
import './placeholder-pages.css';

export default function SimulationPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">🧪 模擬引擎</h1>
            <p className="placeholder-page__subtitle">
                災害情境模擬、桌上推演、能力評核
            </p>

            <div className="placeholder-page__grid">
                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🌊</div>
                    <div className="placeholder-page__card-title">水災模擬</div>
                    <div className="placeholder-page__card-label">淹水範圍預估</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🏔️</div>
                    <div className="placeholder-page__card-title">土石流模擬</div>
                    <div className="placeholder-page__card-label">潛勢區預警</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🏢</div>
                    <div className="placeholder-page__card-title">地震模擬</div>
                    <div className="placeholder-page__card-label">結構損壞評估</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📋</div>
                    <div className="placeholder-page__card-title">桌上推演</div>
                    <div className="placeholder-page__card-label">情境演練設計</div>
                </div>
            </div>
        </div>
    );
}
