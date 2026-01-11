/**
 * PageWrapper.tsx
 * 
 * Wraps traditional page components within AppShellLayout
 * This allows legacy pages to use the new unified layout system
 * with Header, Sidebar, and Widget-compatible structure.
 */
import React from 'react';
import AppShellLayout from './AppShellLayout';
import { PermissionLevel } from './widget.types';
import { useAuth } from '../../context/AuthContext';

interface PageWrapperProps {
    children: React.ReactNode;
    pageId?: string;
}

export default function PageWrapper({ children, pageId = 'page' }: PageWrapperProps) {
    const { user } = useAuth();

    // Map user role to PermissionLevel
    const userLevel = (user?.roleLevel as PermissionLevel) ?? PermissionLevel.Guest;

    return (
        <AppShellLayout userLevel={userLevel} pageId={pageId}>
            {/* Render traditional page content inside the main column */}
            <div className="page-content" style={{
                height: '100%',
                overflow: 'auto',
                padding: '16px',
            }}>
                {children}
            </div>
        </AppShellLayout>
    );
}
