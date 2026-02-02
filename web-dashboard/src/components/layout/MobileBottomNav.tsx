/**
 * MobileBottomNav.tsx
 * 
 * Expert Council Navigation Design v3.0
 * Mobile bottom navigation bar (≤767px)
 * Per expert_council_navigation_design.md §3.1
 * 
 * Features:
 * - 5 main navigation icons
 * - Overflow menu for additional items
 * - Floating Action Button for SOS
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Map,
    Package,
    Users,
    MoreHorizontal,
    AlertCircle,
    Building,
    BarChart3,
    Settings,
    X,
    LucideIcon
} from 'lucide-react';
import './MobileBottomNav.css';

interface NavItem {
    id: string;
    icon: LucideIcon;
    label: string;
    path: string;
}

const MAIN_NAV: NavItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: '指揮艙', path: '/command-center' },
    { id: 'map', icon: Map, label: '地圖', path: '/geo/map' },
    { id: 'rescue', icon: Building, label: '救援', path: '/rescue/shelters' },
    { id: 'resources', icon: Package, label: '後勤', path: '/logistics/inventory' },
    { id: 'more', icon: MoreHorizontal, label: '更多', path: '#more' },
];

const MORE_NAV: NavItem[] = [
    { id: 'workforce', icon: Users, label: '人員動員', path: '/workforce/people' },
    { id: 'analytics', icon: BarChart3, label: '分析知識', path: '/hub/analytics' },
    { id: 'settings', icon: Settings, label: '系統管理', path: '/governance/settings' },
];

export default function MobileBottomNav() {
    const location = useLocation();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const handleMoreClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsMoreOpen(!isMoreOpen);
    };

    return (
        <>
            {/* SOS Floating Action Button */}
            <Link to="/emergency/sos" className="mobile-fab-sos" title="SOS 緊急求救">
                <AlertCircle size={28} strokeWidth={2} />
            </Link>

            {/* More Menu Overlay */}
            {isMoreOpen && (
                <div className="mobile-more-overlay" onClick={() => setIsMoreOpen(false)}>
                    <div className="mobile-more-menu" onClick={e => e.stopPropagation()}>
                        <div className="mobile-more-header">
                            <span>更多功能</span>
                            <button 
                                onClick={() => setIsMoreOpen(false)} 
                                className="mobile-more-close"
                                aria-label="關閉選單"
                                title="關閉選單"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="mobile-more-items">
                            {MORE_NAV.map(item => {
                                const Icon = item.icon;
                                const isActive = location.pathname.startsWith(item.path);
                                return (
                                    <Link
                                        key={item.id}
                                        to={item.path}
                                        className={`mobile-more-item ${isActive ? 'active' : ''}`}
                                        onClick={() => setIsMoreOpen(false)}
                                    >
                                        <Icon size={24} strokeWidth={1.5} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
                {MAIN_NAV.map(item => {
                    const Icon = item.icon;
                    const isActive = item.path !== '#more' && location.pathname.startsWith(item.path);
                    const isMore = item.id === 'more';

                    if (isMore) {
                        return (
                            <button
                                key={item.id}
                                className={`mobile-nav-item ${isMoreOpen ? 'active' : ''}`}
                                onClick={handleMoreClick}
                            >
                                <Icon size={22} strokeWidth={1.5} />
                                <span>{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={22} strokeWidth={1.5} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
