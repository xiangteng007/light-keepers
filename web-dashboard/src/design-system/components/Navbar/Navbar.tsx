import React from 'react';
import './Navbar.css';

export interface NavbarProps {
    logo?: React.ReactNode;
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
    actions?: React.ReactNode;
    theme?: 'A' | 'B';
    className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
    logo,
    title = 'Light Keepers',
    subtitle = '曦望燈塔',
    children,
    actions,
    className = '',
}) => {
    return (
        <nav className={`lk-navbar ${className}`}>
            <div className="lk-navbar__brand">
                {logo && <div className="lk-navbar__logo">{logo}</div>}
                <div className="lk-navbar__title-group">
                    <span className="lk-navbar__title">{title}</span>
                    {subtitle && <span className="lk-navbar__subtitle">{subtitle}</span>}
                </div>
            </div>
            {children && <div className="lk-navbar__content">{children}</div>}
            {actions && <div className="lk-navbar__actions">{actions}</div>}
        </nav>
    );
};

export default Navbar;
