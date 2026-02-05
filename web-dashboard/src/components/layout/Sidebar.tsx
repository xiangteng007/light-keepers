/**
 * Sidebar.tsx
 * 
 * Expert Council Navigation Design v3.0
 * 8-Group Collapsible Sidebar with Emergency Quick Actions
 * Per expert_council_navigation_design.md
 * 
 * Features:
 * - Emergency quick actions (always visible)
 * - 8 collapsible navigation groups
 * - RBAC filtering via useSidebarConfig
 * - User menu with profile/logout
 * - Responsive design ready
 */
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronLeft, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebarConfig, NAV_GROUPS, ICON_MAP } from './useSidebarConfig';
import { PermissionLevel } from './widget.types';
import EmergencyQuickActions from './EmergencyQuickActions';
import LoginModal from '../auth/LoginModal';
import './Sidebar.css';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    
    // Sidebar collapse state with localStorage persistence
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        return saved === 'true';
    });

    // Persist collapse state
    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', String(isCollapsed));
    }, [isCollapsed]);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    // Get user permission level (default to Volunteer for logged in, Anonymous otherwise)
    const userLevel = user 
        ? (user.roleLevel ?? PermissionLevel.Volunteer)
        : PermissionLevel.Anonymous;

    // Get filtered nav items and groups
    const {
        navGroups,
        groupedItems,
        collapsedGroups,
        toggleGroup,
    } = useSidebarConfig(userLevel);

    const handleAvatarClick = () => {
        if (!user) {
            setIsLoginOpen(true);
        } else {
            setIsUserMenuOpen(!isUserMenuOpen);
        }
    };

    const handleLogout = async () => {
        setIsUserMenuOpen(false);
        await logout();
        navigate('/login');
    };

    return (
        <>
            <aside className={`v3-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                {/* Collapse Toggle Button */}
                <button
                    className="v3-sidebar-toggle"
                    onClick={toggleSidebar}
                    title={isCollapsed ? '展開側邊欄' : '收合側邊欄'}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <ChevronLeft size={14} />
                </button>

                {/* Logo */}
                <div className="v3-logo" title="Light Keepers Tactical V3">
                    <span className="v3-logo-icon">LK</span>
                    <span className="v3-logo-text">光守護者</span>
                </div>

                {/* Emergency Quick Actions - hide when collapsed */}
                {!isCollapsed && <EmergencyQuickActions />}

                {/* Navigation Groups */}
                <nav className="v3-nav-groups">
                    {navGroups
                        .filter(group => group.id !== 'emergency') // Emergency is handled separately
                        .map(group => {
                            const items = groupedItems[group.id] || [];
                            if (items.length === 0) return null;

                            const isGroupCollapsed = collapsedGroups.has(group.id);
                            const GroupIcon = ICON_MAP[group.icon] || User;

                            return (
                                <div key={group.id} className="v3-nav-group">
                                    <button
                                        className="v3-nav-group-header"
                                        onClick={() => toggleGroup(group.id)}
                                        aria-expanded={!isGroupCollapsed}
                                    >
                                        <span className="v3-nav-group-icon">
                                            <GroupIcon size={16} strokeWidth={1.5} />
                                        </span>
                                        <span className="v3-nav-group-label">{group.label}</span>
                                        <span className="v3-nav-group-chevron">
                                            {isGroupCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                        </span>
                                    </button>

                                    {!isGroupCollapsed && (
                                        <div className="v3-nav-group-items">
                                            {items.map(item => {
                                                const ItemIcon = ICON_MAP[item.icon] || User;
                                                const isActive = location.pathname === item.path ||
                                                    location.pathname.startsWith(item.path + '/');

                                                return (
                                                    <Link
                                                        key={item.id}
                                                        to={item.path}
                                                        className={`v3-nav-item ${isActive ? 'active' : ''}`}
                                                        title={item.label}
                                                    >
                                                        <ItemIcon size={18} strokeWidth={1.5} />
                                                        <span>{item.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </nav>

                {/* User Section */}
                <div className="v3-user-section">
                    {/* User Menu Popover */}
                    {isUserMenuOpen && user && (
                        <div className="v3-user-menu">
                            <div className="v3-user-menu-header">
                                <p className="v3-user-name">{user.displayName || 'Operator'}</p>
                                <p className="v3-user-email">{user.email}</p>
                            </div>
                            <button
                                onClick={() => { setIsUserMenuOpen(false); navigate('/profile'); }}
                                className="v3-user-menu-item"
                            >
                                <User size={14} />
                                個人檔案
                            </button>
                            <button
                                onClick={handleLogout}
                                className="v3-user-menu-item v3-user-menu-item--danger"
                            >
                                <LogOut size={14} />
                                登出
                            </button>
                        </div>
                    )}

                    <button
                        className={`v3-user-avatar ${isUserMenuOpen ? 'active' : ''}`}
                        onClick={handleAvatarClick}
                        title={user ? "使用者選單" : "登入"}
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="User" />
                        ) : (
                            <User size={20} strokeWidth={1.5} />
                        )}
                        {user && <span className="v3-user-status online" />}
                    </button>
                </div>
            </aside>

            {/* Login Modal */}
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </>
    );
}

// Export NAV_ITEMS for backward compatibility
export { NAV_GROUPS as NAV_ITEMS };
