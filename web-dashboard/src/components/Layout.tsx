import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart3,
    AlertTriangle,
    Siren,
    ClipboardList,
    ClipboardCheck,
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
    X,
    LogOut,
    User,
    Shield,
    CloudSun,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logoImage from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import { getTasks } from '../api/services';

const API_BASE = import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1';

interface NavItem {
    id: string;
    path: string;
    label: string;
    icon: LucideIcon;
    requiredLevel: number;
    sortOrder: number;
}

// Icon mapping for dynamic icon resolution
const iconMap: Record<string, LucideIcon> = {
    LayoutDashboard,
    BarChart3,
    AlertTriangle,
    Siren,
    ClipboardList,
    ClipboardCheck,
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
    Shield,
    CloudSun,
    Wallet,
};

// Default nav items as fallback
const defaultNavItems: NavItem[] = [
    { id: 'dashboard', path: '/dashboard', label: '儀表板', icon: LayoutDashboard, requiredLevel: 0, sortOrder: 1 },
    { id: 'analytics', path: '/analytics', label: '數據分析', icon: BarChart3, requiredLevel: 3, sortOrder: 2 },
    { id: 'ncdr-alerts', path: '/ncdr-alerts', label: '災害示警', icon: AlertTriangle, requiredLevel: 0, sortOrder: 3 },
    { id: 'events', path: '/events', label: '災情事件', icon: Siren, requiredLevel: 1, sortOrder: 4 },
    { id: 'tasks', path: '/tasks', label: '任務管理', icon: ClipboardList, requiredLevel: 2, sortOrder: 5 },
    { id: 'map', path: '/map', label: '地圖總覽', icon: Map, requiredLevel: 0, sortOrder: 6 },
    { id: 'forecast', path: '/forecast', label: '氣象預報', icon: CloudSun, requiredLevel: 0, sortOrder: 7 },
    { id: 'manuals', path: '/manuals', label: '實務手冊', icon: BookOpen, requiredLevel: 0, sortOrder: 8 },
    { id: 'report', path: '/report', label: '回報系統', icon: MessageSquareWarning, requiredLevel: 1, sortOrder: 9 },
    { id: 'reports-admin', path: '/reports/admin', label: '回報審核', icon: CheckSquare, requiredLevel: 2, sortOrder: 10 },
    { id: 'reports-export', path: '/reports/export', label: '報表匯出', icon: FileDown, requiredLevel: 3, sortOrder: 11 },
    { id: 'volunteers', path: '/volunteers', label: '志工管理', icon: Users, requiredLevel: 2, sortOrder: 12 },
    { id: 'volunteers-schedule', path: '/volunteers/schedule', label: '志工排班', icon: CalendarDays, requiredLevel: 2, sortOrder: 13 },
    { id: 'volunteer-register', path: '/volunteer-register', label: '登記志工', icon: ClipboardCheck, requiredLevel: 1, sortOrder: 14 },
    { id: 'training', path: '/training', label: '培訓中心', icon: GraduationCap, requiredLevel: 1, sortOrder: 15 },
    { id: 'resources', path: '/resources', label: '物資管理', icon: Package, requiredLevel: 2, sortOrder: 16 },
    { id: 'notifications', path: '/notifications', label: '通知中心', icon: Bell, requiredLevel: 1, sortOrder: 17 },
    { id: 'permissions', path: '/permissions', label: '權限管理', icon: Shield, requiredLevel: 4, sortOrder: 18 },
    { id: 'donations', path: '/donations', label: '捐款管理', icon: Wallet, requiredLevel: 5, sortOrder: 19 },
];

// Simple Nav Item Component (no drag/edit)
function NavItemComponent({
    item,
    isActive,
    onClick,
}: {
    item: NavItem;
    isActive: boolean;
    onClick: () => void;
}) {
    const IconComponent = item.icon;

    return (
        <Link
            to={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            <span className="nav-icon">
                <IconComponent size={20} strokeWidth={1.5} />
            </span>
            <span className="nav-label">{item.label}</span>
        </Link>
    );
}

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);

    // Get user's role level (default to 0 for not logged in)
    const userLevel = user?.roleLevel ?? 0;

    // Filter nav items based on user's role level and sort by sortOrder
    const visibleNavItems = navItems
        .filter(item => item.requiredLevel <= userLevel)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    // 登入任務提醒 - 顯示用戶待處理的任務數量
    const [pendingTaskCount, setPendingTaskCount] = useState(0);

    useEffect(() => {
        if (user && userLevel >= 2) {
            getTasks({ status: 'pending', limit: 100 })
                .then(res => {
                    setPendingTaskCount(res.data?.data?.length || 0);
                })
                .catch(() => setPendingTaskCount(0));
        }
    }, [user, userLevel]);

    // Load nav config from backend page-permissions API
    useEffect(() => {
        const loadPagePermissions = async () => {
            try {
                const response = await fetch(`${API_BASE}/accounts/page-permissions`);
                if (!response.ok) return;

                const permissions = await response.json();
                if (!Array.isArray(permissions) || permissions.length === 0) return;

                // Build updated nav items from backend data
                const updatedItems = defaultNavItems.map(item => {
                    const perm = permissions.find((p: any) => p.pageKey === item.id);
                    if (perm) {
                        // Get icon from iconMap or use default
                        const icon = perm.icon && iconMap[perm.icon] ? iconMap[perm.icon] : item.icon;
                        return {
                            ...item,
                            label: perm.pageName || item.label,
                            requiredLevel: perm.requiredLevel ?? item.requiredLevel,
                            sortOrder: perm.sortOrder ?? item.sortOrder,
                            icon,
                        };
                    }
                    return item;
                });

                // Sort by sortOrder from backend
                updatedItems.sort((a, b) => a.sortOrder - b.sortOrder);
                setNavItems(updatedItems);
            } catch (error) {
                console.error('Failed to load page permissions:', error);
                // Keep default items on error
            }
        };

        loadPagePermissions();
    }, []);

    const handleNavClick = () => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
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
                    {visibleNavItems.map((item) => (
                        <NavItemComponent
                            key={item.id}
                            item={item}
                            isActive={location.pathname === item.path}
                            onClick={handleNavClick}
                        />
                    ))}
                </nav>

                {/* Task Reminder for Officers */}
                {userLevel >= 2 && pendingTaskCount > 0 && (
                    <div className="sidebar-reminder">
                        <Link to="/tasks" className="sidebar-reminder__link">
                            📋 您有 {pendingTaskCount} 個待處理任務
                        </Link>
                    </div>
                )}

                {/* User Profile Section */}
                <div className="sidebar-user">
                    <Link to="/profile" className="sidebar-user__info" onClick={handleNavClick}>
                        <div className="sidebar-user__avatar">
                            <User size={18} />
                        </div>
                        <div className="sidebar-user__details">
                            <span className="sidebar-user__name">{user?.displayName || user?.email || '用戶'}</span>
                            <span className="sidebar-user__role">{user?.roleDisplayName || '一般民眾'}</span>
                        </div>
                    </Link>
                    <button className="sidebar-user__logout" onClick={handleLogout} title="登出">
                        <LogOut size={18} />
                    </button>
                </div>

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
