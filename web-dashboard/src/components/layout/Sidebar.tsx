import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Radio,
    Package,
    Users,
    Map as MapIcon,
    Settings,
    User,
    LogOut,
    ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../auth/LoginModal';

// ===== Nav Data =====
export const NAV_ITEMS = [
    { id: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: '指揮艙' },
    { id: 'map', path: '/map', icon: MapIcon, label: '戰術地圖' },
    { id: 'events', path: '/events', icon: Radio, label: '災情通報' },
    { id: 'resources', path: '/resources', icon: Package, label: '物資庫房' },
    { id: 'team', path: '/volunteers', icon: Users, label: '部隊管理' },
    { id: 'settings', path: '/settings', icon: Settings, label: '系統設定' },
];

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const handleAvatarClick = () => {
        if (!user) {
            setIsLoginOpen(true);
        } else {
            setIsUserMenuOpen(!isUserMenuOpen);
        }
    };

    const handleLogout = () => {
        logout();
        setIsUserMenuOpen(false);
        navigate('/');
    };

    return (
        <>
            <aside className="v2-nav-rail">
                <div className="v2-logo" title="Light Keepers Tactical V2">
                    LK
                </div>

                <nav className="v2-nav-items">
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={`v2-nav-item ${isActive ? 'active' : ''}`}
                                title={item.label}
                            >
                                <Icon strokeWidth={1.5} size={24} />
                            </Link>
                        );
                    })}
                </nav>

                <div className="relative">
                    {/* User Menu Popover */}
                    {isUserMenuOpen && user && (
                        <div className="absolute bottom-full left-4 mb-2 w-48 bg-[#1D2635] border border-[#2F3641] rounded-md shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                            <div className="px-4 py-3 border-b border-[#2F3641]/50 bg-[#13171F]/50">
                                <p className="text-xs text-white font-bold truncate">{user.displayName || 'Operator'}</p>
                                <p className="text-[10px] text-gray-500 font-mono truncate">{user.email}</p>
                            </div>
                            <button
                                onClick={() => { setIsUserMenuOpen(false); navigate('/profile'); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2F3641] hover:text-white transition-colors flex items-center gap-2"
                            >
                                <User size={14} /> Profile
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#2F3641] hover:text-red-300 transition-colors flex items-center gap-2"
                            >
                                <LogOut size={14} /> Logout
                            </button>
                        </div>
                    )}

                    <button
                        className={`v2-nav-user ${isUserMenuOpen ? 'ring-2 ring-[#C39B6F]' : ''}`}
                        onClick={handleAvatarClick}
                        title={user ? "User Menu" : "Login"}
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={24} color="#94A3B8" style={{ margin: 'auto' }} />
                        )}
                        {user && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#0F1218]"></div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Login Modal */}
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </>
    );
}
