/**
 * FieldCommsPage.tsx
 * 
 * 現地通訊頁面 - 無線電/弱網/衛星備援
 */
import './placeholder-pages.css';

export default function FieldCommsPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">📻 現地通訊</h1>
            <p className="placeholder-page__subtitle">
                無線電通訊、弱網環境、衛星備援通訊管理
            </p>

            <div className="placeholder-page__grid">
                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📡</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--green">5/5</div>
                    <div className="placeholder-page__card-label">通訊頻道在線</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">🛰️</div>
                    <div className="placeholder-page__card-value">備用</div>
                    <div className="placeholder-page__card-label">衛星通訊狀態</div>
                </div>

                <div className="placeholder-page__card">
                    <div className="placeholder-page__card-icon">📶</div>
                    <div className="placeholder-page__card-value placeholder-page__card-value--blue">85%</div>
                    <div className="placeholder-page__card-label">Mesh 網路覆蓋</div>
                </div>
            </div>
        </div>
    );
}
