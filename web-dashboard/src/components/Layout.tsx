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
    Car,
    ShieldCheck,
    Award,
    ChevronDown,
    ChevronRight,
    MessageCircle,
    Calendar,
    Trophy,
    Database,
    Settings,
    Tag,
    Eye,
    PackageOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logoImage from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import { getTasks } from '../api/services';

// ===== 類型定義 =====
interface NavItem {
    id: string;
    path: string;
    label: string;
    icon: LucideIcon;
    requiredLevel: number;
}

interface NavGroup {
    id: string;
    label: string;
    icon: LucideIcon;
    items: NavItem[];
    minLevel: number; // 最低權限等級可見
    defaultOpen?: boolean;
}

// ===== 導航分組配置 =====
const navGroups: NavGroup[] = [
    {
        id: 'overview',
        label: '總覽',
        icon: LayoutDashboard,
        minLevel: 0,
        defaultOpen: true,
        items: [
            { id: 'dashboard', path: '/dashboard', label: '儀表板', icon: LayoutDashboard, requiredLevel: 0 },
            { id: 'ncdr-alerts', path: '/ncdr-alerts', label: '災害示警', icon: AlertTriangle, requiredLevel: 0 },
            { id: 'forecast', path: '/forecast', label: '氣象預報', icon: CloudSun, requiredLevel: 0 },
        ],
    },
    {
        id: 'emergency',
        label: '災情中心',
        icon: Siren,
        minLevel: 0,
        defaultOpen: true,
        items: [
            { id: 'events', path: '/events', label: '災情事件', icon: Siren, requiredLevel: 1 },
            { id: 'map', path: '/map', label: '地圖總覽', icon: Map, requiredLevel: 0 },
            { id: 'tasks', path: '/tasks', label: '任務管理', icon: ClipboardList, requiredLevel: 2 },
        ],
    },
    {
        id: 'community',
        label: '社群互動',
        icon: MessageCircle,
        minLevel: 1,
        items: [
            { id: 'community', path: '/community', label: '社群牆', icon: MessageCircle, requiredLevel: 1 },
            { id: 'activities', path: '/activities', label: '活動報名', icon: Calendar, requiredLevel: 1 },
            { id: 'leaderboard', path: '/leaderboard', label: '志工排行榜', icon: Trophy, requiredLevel: 1 },
            { id: 'notifications', path: '/notifications', label: '通知中心', icon: Bell, requiredLevel: 1 },
        ],
    },
    {
        id: 'reports',
        label: '回報系統',
        icon: MessageSquareWarning,
        minLevel: 1,
        items: [
            { id: 'report', path: '/report', label: '我的回報', icon: MessageSquareWarning, requiredLevel: 1 },
            { id: 'reports-admin', path: '/reports/admin', label: '回報審核', icon: CheckSquare, requiredLevel: 2 },
            { id: 'reports-export', path: '/reports/export', label: '報表匯出', icon: FileDown, requiredLevel: 3 },
            { id: 'report-schedules', path: '/report-schedules', label: '報表排程', icon: CalendarDays, requiredLevel: 2 },
        ],
    },
    {
        id: 'my-account',
        label: '我的帳戶',
        icon: User,
        minLevel: 1,
        items: [
            { id: 'profile', path: '/profile', label: '我的資料', icon: User, requiredLevel: 1 },
            { id: 'my-vehicles', path: '/my-vehicles', label: '我的車輛', icon: Car, requiredLevel: 1 },
            { id: 'my-insurance', path: '/my-insurance', label: '我的保險', icon: ShieldCheck, requiredLevel: 1 },
            { id: 'my-points', path: '/my-points', label: '我的積分', icon: Award, requiredLevel: 1 },
            { id: 'training', path: '/training', label: '培訓中心', icon: GraduationCap, requiredLevel: 1 },
            { id: 'volunteer-register', path: '/volunteer-register', label: '登記志工', icon: ClipboardCheck, requiredLevel: 1 },
        ],
    },
    {
        id: 'volunteer-mgmt',
        label: '志工管理',
        icon: Users,
        minLevel: 2,
        items: [
            { id: 'volunteers', path: '/volunteers', label: '志工列表', icon: Users, requiredLevel: 2 },
            { id: 'volunteers-schedule', path: '/volunteers/schedule', label: '志工排班', icon: CalendarDays, requiredLevel: 2 },
            { id: 'approvals', path: '/approvals', label: '審批中心', icon: CheckSquare, requiredLevel: 2 },
        ],
    },
    {
        id: 'resources',
        label: '資源管理',
        icon: Package,
        minLevel: 1,
        items: [
            { id: 'resources', path: '/resources', label: '物資管理', icon: Package, requiredLevel: 2 },
            { id: 'resources-public', path: '/resources-public', label: '公開物資', icon: PackageOpen, requiredLevel: 1 },
        ],
    },
    {
        id: 'knowledge',
        label: '知識庫',
        icon: BookOpen,
        minLevel: 0,
        items: [
            { id: 'manuals', path: '/manuals', label: '實務手冊', icon: BookOpen, requiredLevel: 0 },
        ],
    },
    {
        id: 'system',
        label: '系統設定',
        icon: Settings,
        minLevel: 3,
        items: [
            { id: 'analytics', path: '/analytics', label: '數據分析', icon: BarChart3, requiredLevel: 3 },
            { id: 'sensitive-audit', path: '/sensitive-audit', label: '敏感審計', icon: Eye, requiredLevel: 3 },
            { id: 'label-management', path: '/label-management', label: '標籤管理', icon: Tag, requiredLevel: 3 },
            { id: 'backups', path: '/backups', label: '備份管理', icon: Database, requiredLevel: 3 },
            { id: 'permissions', path: '/permissions', label: '權限管理', icon: Shield, requiredLevel: 4 },
            { id: 'donations', path: '/donations', label: '捐款管理', icon: Wallet, requiredLevel: 5 },
        ],
    },
];

// ===== 導航分組元件 =====
function NavGroupComponent({
    group,
    userLevel,
    isOpen,
    onToggle,
    currentPath,
    onNavClick,
}: {
    group: NavGroup;
    userLevel: number;
    isOpen: boolean;
    onToggle: () => void;
    currentPath: string;
    onNavClick: () => void;
}) {
    // 過濾用戶可見的項目
    const visibleItems = group.items.filter(item => item.requiredLevel <= userLevel);

    // 如果沒有可見項目，不渲染此分組
    if (visibleItems.length === 0) return null;

    // 檢查是否有 active 項目
    const hasActiveItem = visibleItems.some(item => currentPath === item.path || currentPath.startsWith(item.path + '/'));

    const GroupIcon = group.icon;

    return (
        <div className={`nav-group ${isOpen ? 'open' : ''} ${hasActiveItem ? 'has-active' : ''}`}>
            <button className="nav-group__header" onClick={onToggle}>
                <span className="nav-group__icon">
                    <GroupIcon size={18} />
                </span>
                <span className="nav-group__label">{group.label}</span>
                <span className="nav-group__arrow">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
            </button>

            {isOpen && (
                <div className="nav-group__items">
                    {visibleItems.map(item => {
                        const ItemIcon = item.icon;
                        const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');

                        return (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                                onClick={onNavClick}
                            >
                                <span className="nav-item__icon">
                                    <ItemIcon size={16} />
                                </span>
                                <span className="nav-item__label">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ===== Layout 主元件 =====
export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // 分組展開狀態（從 localStorage 恢復）
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('nav_open_groups');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return {};
            }
        }
        // 預設開啟有 defaultOpen 的分組
        return navGroups.reduce((acc, group) => {
            acc[group.id] = group.defaultOpen ?? false;
            return acc;
        }, {} as Record<string, boolean>);
    });

    // 儲存分組展開狀態
    useEffect(() => {
        localStorage.setItem('nav_open_groups', JSON.stringify(openGroups));
    }, [openGroups]);

    // 自動展開當前路徑所在的分組
    useEffect(() => {
        navGroups.forEach(group => {
            const hasMatchingItem = group.items.some(
                item => location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            );
            if (hasMatchingItem && !openGroups[group.id]) {
                setOpenGroups(prev => ({ ...prev, [group.id]: true }));
            }
        });
    }, [location.pathname]);

    const userLevel = user?.roleLevel ?? 0;

    // 切換分組展開
    const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // 待處理任務數量
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

    const handleNavClick = () => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // 過濾用戶可見的分組
    const visibleGroups = navGroups.filter(group => group.minLevel <= userLevel);

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
                    {visibleGroups.map(group => (
                        <NavGroupComponent
                            key={group.id}
                            group={group}
                            userLevel={userLevel}
                            isOpen={openGroups[group.id] ?? false}
                            onToggle={() => toggleGroup(group.id)}
                            currentPath={location.pathname}
                            onNavClick={handleNavClick}
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

                {/* User Profile Section / Login Buttons */}
                {user && !user.isAnonymous ? (
                    <div className="sidebar-user">
                        <Link to="/profile" className="sidebar-user__info" onClick={handleNavClick}>
                            <div className="sidebar-user__avatar">
                                <User size={18} />
                            </div>
                            <div className="sidebar-user__details">
                                <span className="sidebar-user__name">{user.displayName || user.email || '用戶'}</span>
                                <span className="sidebar-user__role">{user.roleDisplayName || '志工'}</span>
                            </div>
                        </Link>
                        <button className="sidebar-user__logout" onClick={handleLogout} title="登出">
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="sidebar-auth">
                        <Link to="/login" className="sidebar-auth__btn" onClick={handleNavClick}>
                            登入 / 註冊
                        </Link>
                    </div>
                )}

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
