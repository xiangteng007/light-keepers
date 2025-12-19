import { Outlet, Link, useLocation } from 'react-router-dom'

const navItems = [
    { path: '/dashboard', label: '儀表板', icon: '📊' },
    { path: '/events', label: '災情事件', icon: '🚨' },
    { path: '/tasks', label: '任務管理', icon: '📋' },
]

export default function Layout() {
    const location = useLocation()

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="logo">
                    <span className="logo-icon">🌟</span>
                    <h1>Light Keepers</h1>
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
                    <span>v0.1.0 MVP</span>
                </div>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    )
}
