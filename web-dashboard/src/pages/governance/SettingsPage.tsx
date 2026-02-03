/**
 * SettingsPage.tsx
 * 
 * 系統設定頁面
 */
import '../placeholder-pages.css';

export default function SettingsPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">⚙️ 系統設定</h1>
            <p className="placeholder-page__subtitle">
                系統參數、環境配置、整合設定
            </p>

            <div className="placeholder-page__settings-list">
                <div className="placeholder-page__settings-item">
                    <div className="placeholder-page__settings-label">🌐 語言設定</div>
                    <div className="placeholder-page__settings-value">繁體中文 (zh-TW)</div>
                </div>

                <div className="placeholder-page__settings-item">
                    <div className="placeholder-page__settings-label">🌙 主題模式</div>
                    <div className="placeholder-page__settings-value">深色模式 (Dark Mode)</div>
                </div>

                <div className="placeholder-page__settings-item">
                    <div className="placeholder-page__settings-label">🔔 通知設定</div>
                    <div className="placeholder-page__settings-value">Web Push 已啟用</div>
                </div>

                <div className="placeholder-page__settings-item">
                    <div className="placeholder-page__settings-label">📱 PWA 設定</div>
                    <div className="placeholder-page__settings-value">已安裝為獨立應用</div>
                </div>
            </div>
        </div>
    );
}
