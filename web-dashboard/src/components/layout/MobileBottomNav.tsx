/**
 * MobileBottomNav.tsx
 * 
 * Mobile bottom navigation bar for small screen devices.
 * Provides quick access to main app sections.
 */
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, ClipboardList, Map } from 'lucide-react';
import './MobileBottomNav.css';

interface NavItem {
    to: string;
    icon: React.ReactNode;
    label: string;
}

const navItems: NavItem[] = [
    { to: '/command-center', icon: <LayoutDashboard size={20} />, label: '指揮' },
    { to: '/incidents', icon: <AlertTriangle size={20} />, label: '事件' },
    { to: '/tasks', icon: <ClipboardList size={20} />, label: '任務' },
    { to: '/geo/map', icon: <Map size={20} />, label: '地圖' },
];

export default function MobileBottomNav() {
    const location = useLocation();

    return (
        <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => {
                const isActive = location.pathname === item.to || 
                    (item.to === '/command-center' && location.pathname === '/');
                
                return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={`mobile-nav__item ${isActive ? 'mobile-nav__item--active' : ''}`}
                    >
                        <span className="mobile-nav__icon">{item.icon}</span>
                        <span className="mobile-nav__label">{item.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
}
