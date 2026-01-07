import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Radio,
    Package,
    Users,
    Map as MapIcon,
    Settings,
    Bell,
    Search,
    User,
    LogOut,
    Menu,
    X,
    Cpu,
    Activity,
    Wifi
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

import Sidebar, { NAV_ITEMS } from './layout/Sidebar';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Clock Tick
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="v2-framework">
            {/* Zone A: Slim Nav Rail */}
            <Sidebar />

            {/* Zone B: Header */}
            <header className="v2-header">
                <div className="v2-breadcrumbs">
                    <span className="v2-breadcrumbs__root">LIGHT KEEPERS</span>
                    <span className="v2-breadcrumbs__sep">/</span>
                    <span className="v2-breadcrumbs__current">
                        {NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.label || 'DASHBOARD'}
                    </span>
                </div>

                <div className="relative w-[320px]">
                    <Search
                        className="text-gray-500 pointer-events-none"
                        size={16}
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                        type="text"
                        placeholder="SEARCH INTEL..."
                        className="w-full bg-[#13171F] border border-[#2F3641] rounded-md py-2 pl-10 pr-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-[#C39B6F] focus:ring-1 focus:ring-[#C39B6F] transition-all placeholder:text-gray-600"
                    />
                </div>

                <div className="flex items-center gap-4">
                    {/* Notification Icon - Pure Lucide SVG with Tactical Styling */}
                    <button
                        className="text-[#94A3B8] hover:text-[#C39B6F] hover:bg-[#1D2635] hover:bg-opacity-50 rounded-full p-2 transition-colors duration-200 flex items-center justify-center focus:outline-none ring-offset-0 focus:ring-1 focus:ring-[#C39B6F]"
                        title="Notifications"
                        style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
                    >
                        <Bell size={20} strokeWidth={1.5} />
                    </button>

                    {/* System Status - Text based */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-[#0B1120]/50 border border-[#2F3641]">
                        <Activity size={14} className="text-neon-cyan animate-pulse" />
                        <span className="text-neon-cyan font-mono text-xs tracking-wider">
                            SYS: ONLINE
                        </span>
                    </div>
                </div>
            </header>

            {/* Zone C: Content Viewport */}
            <main className="v2-content">
                <Outlet />
            </main>

            {/* Zone D: Status Ticker */}
            <footer className="v2-ticker">
                <div className="v2-ticker__item">
                    <Activity size={14} className="text-neon-cyan" />
                    <span className="v2-ticker__label">STATUS:</span>
                    <span className="v2-ticker__value text-neon-success">OPERATIONAL</span>
                </div>
                <div className="v2-ticker__item">
                    <Cpu size={14} className="text-neon-amber" />
                    <span className="v2-ticker__label">CPU:</span>
                    <span className="v2-ticker__value">12%</span>
                </div>
                <div className="v2-ticker__item">
                    <Wifi size={14} className="text-neon-cyan" />
                    <span className="v2-ticker__label">NET:</span>
                    <span className="v2-ticker__value">1.2 GB/s</span>
                </div>
                <div className="v2-ticker__item ml-auto">
                    <span className="v2-ticker__value text-neon-amber">{formatTime(currentTime)} UTC</span>
                </div>
            </footer>

            {/* Mobile Nav (Visible only on mobile via CSS) */}
            <div className="v2-mobile-nav hidden md:hidden">
                {/* Mobile nav implementation handled by CSS media queries mostly, 
                     but we can add a simple bottom bar here if needed. 
                     For now rely on CSS hiding the sidebar and showing this.
                 */}
            </div>
        </div>
    );
}
