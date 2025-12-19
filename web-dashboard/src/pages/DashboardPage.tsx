export default function DashboardPage() {
    return (
        <div className="page dashboard-page">
            <h2>儀表板</h2>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🚨</div>
                    <div className="stat-content">
                        <span className="stat-value">12</span>
                        <span className="stat-label">進行中事件</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <span className="stat-value">28</span>
                        <span className="stat-label">待處理任務</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <span className="stat-value">45</span>
                        <span className="stat-label">活躍志工</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <span className="stat-value">89%</span>
                        <span className="stat-label">任務完成率</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections">
                <section className="recent-events">
                    <h3>最新事件</h3>
                    <div className="event-list">
                        <div className="event-item priority-high">
                            <span className="event-category">淹水</span>
                            <span className="event-title">光復路積水達50公分</span>
                            <span className="event-time">10分鐘前</span>
                        </div>
                        <div className="event-item priority-medium">
                            <span className="event-category">道路</span>
                            <span className="event-title">大進路樹木倒塌</span>
                            <span className="event-time">25分鐘前</span>
                        </div>
                        <div className="event-item priority-low">
                            <span className="event-category">物資</span>
                            <span className="event-title">社區需要沙包支援</span>
                            <span className="event-time">1小時前</span>
                        </div>
                    </div>
                </section>

                <section className="map-preview">
                    <h3>地圖概覽</h3>
                    <div className="map-placeholder">
                        <span>🗺️ 地圖視覺化區域</span>
                        <p>整合 MapView 後將在此顯示事件分佈</p>
                    </div>
                </section>
            </div>
        </div>
    )
}
