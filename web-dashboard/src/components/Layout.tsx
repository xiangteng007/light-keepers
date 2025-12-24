import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import logoImage from '../assets/logo.jpg';

const navItems = [
    { path: '/dashboard', label: '儀表板', icon: '📊' },
    { path: '/analytics', label: '數據分析', icon: '📈' },
    { path: '/ncdr-alerts', label: '災害示警', icon: '⚠️' },
    { path: '/events', label: '災情事件', icon: '🚨' },
    { path: '/tasks', label: '任務管理', icon: '📋' },
    { path: '/map', label: '地圖總覽', icon: '🗺️' },
    { path: '/manuals', label: '實務手冊', icon: '📖' },
    { path: '/report', label: '回報系統', icon: '📢' },
    { path: '/reports/admin', label: '回報審核', icon: '✅' },
    { path: '/reports/export', label: '報表匯出', icon: '📥' },
    { path: '/volunteers', label: '志工管理', icon: '👥' },
    { path: '/volunteers/schedule', label: '志工排班', icon: '📅' },
    { path: '/training', label: '培訓中心', icon: '🎓' },
    { path: '/resources', label: '物資管理', icon: '📦' },
    { path: '/notifications', label: '通知中心', icon: '🔔' },
];

export default function Layout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleNavClick = () => {
        // 手機版點擊導覽後關閉側邊欄
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    };

    return (
        <div className="layout">
            {/* 手機版頂部導覽列 */}
            <header className="mobile-header">
                <button
                    className="hamburger-btn"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Toggle menu"
                >
                    <span className="hamburger-icon">{sidebarOpen ? '✕' : '☰'}</span>
                </button>
                <div className="mobile-header__title">Light Keepers</div>
                <div className="mobile-header__actions">
                    <Link to="/notifications" className="mobile-header__icon">🔔</Link>
                    <div className="mobile-header__avatar">A</div>
                </div>
            </header>

            {/* 側邊欄遮罩 */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* 側邊欄 */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
                <div className="logo">
                    <div className="logo-icon">
                        <img src={logoImage} alt="Light Keepers Logo" className="logo-image" />
                    </div>
                    <div>
                        <h1>Light Keepers</h1>
                        <div className="logo-subtitle">曦望燈塔</div>
                    </div>
                </div>
                <nav className="nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                            onClick={handleNavClick}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <span>v1.0.0 • 曦望燈塔救援協會</span>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
