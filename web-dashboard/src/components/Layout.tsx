import { Outlet, Link, useLocation } from 'react-router-dom'
import logoImage from '../assets/logo.jpg'

const navItems = [
    { path: '/dashboard', label: '儀表板', icon: '📊' },
    { path: '/ncdr-alerts', label: '災害示警', icon: '⚠️' },
    { path: '/events', label: '災情事件', icon: '🚨' },
    { path: '/tasks', label: '任務管理', icon: '📋' },
    { path: '/map', label: '地圖總覽', icon: '🗺️' },
    { path: '/manuals', label: '實務手冊', icon: '📖' },
    { path: '/report', label: '災情回報', icon: '📢' },
    { path: '/volunteers', label: '志工管理', icon: '👥' },
    { path: '/training', label: '培訓中心', icon: '🎓' },
    { path: '/resources', label: '物資管理', icon: '📦' },
]

export default function Layout() {
    const location = useLocation()

    return (
        <div className="layout">
            <aside className="sidebar">
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
    )
}
