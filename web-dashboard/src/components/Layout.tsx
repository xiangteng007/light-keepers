import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart3,
    AlertTriangle,
    Siren,
    ClipboardList,
    Map,
    BookOpen,
    MessageSquareWarning,
    CheckSquare,
    FileDown,
    Users,
    CalendarDays,
    GraduationCap,
    Package,
    Bell,
    Menu,
    X
} from 'lucide-react';
import logoImage from '../assets/logo.jpg';

const navItems = [
    { path: '/dashboard', label: '儀表板', icon: LayoutDashboard },
    { path: '/analytics', label: '數據分析', icon: BarChart3 },
    { path: '/ncdr-alerts', label: '災害示警', icon: AlertTriangle },
    { path: '/events', label: '災情事件', icon: Siren },
    { path: '/tasks', label: '任務管理', icon: ClipboardList },
    { path: '/map', label: '地圖總覽', icon: Map },
    { path: '/manuals', label: '實務手冊', icon: BookOpen },
    { path: '/report', label: '回報系統', icon: MessageSquareWarning },
    { path: '/reports/admin', label: '回報審核', icon: CheckSquare },
    { path: '/reports/export', label: '報表匯出', icon: FileDown },
    { path: '/volunteers', label: '志工管理', icon: Users },
    { path: '/volunteers/schedule', label: '志工排班', icon: CalendarDays },
    { path: '/training', label: '培訓中心', icon: GraduationCap },
    { path: '/resources', label: '物資管理', icon: Package },
    { path: '/notifications', label: '通知中心', icon: Bell },
];

export default function Layout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleNavClick = () => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    };

    return (
        <div className="layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <button
                    className="hamburger-btn"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Toggle menu"
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <div className="mobile-header__title">Light Keepers</div>
                <div className="mobile-header__actions">
                    <Link to="/notifications" className="mobile-header__icon">
                        <Bell size={20} />
                    </Link>
                    <div className="mobile-header__avatar">A</div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
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
                    {navItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                                onClick={handleNavClick}
                            >
                                <span className="nav-icon">
                                    <IconComponent size={20} strokeWidth={1.5} />
                                </span>
                                <span className="nav-label">{item.label}</span>
                            </Link>
                        );
                    })}
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
