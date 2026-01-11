/**
 * PageWrapper.tsx
 * 
 * Wraps page components within AppShellLayout
 * Two modes:
 * 1. Widget Mode (useWidgets=true): Uses WidgetGrid with page-specific widget config
 * 2. Legacy Mode (useWidgets=false): Renders children in main content area
 */
import React from 'react';
import AppShellLayout from './AppShellLayout';
import { PermissionLevel, PAGE_WIDGET_CONFIGS } from './widget.types';
import { useAuth } from '../../context/AuthContext';

interface PageWrapperProps {
    children?: React.ReactNode;
    pageId?: string;
    useWidgets?: boolean;  // If true, use WidgetGrid instead of children
}

export default function PageWrapper({
    children,
    pageId = 'page',
    useWidgets,
}: PageWrapperProps) {
    const { user } = useAuth();

    // Map user role to PermissionLevel
    const userLevel = (user?.roleLevel as PermissionLevel) ?? PermissionLevel.Guest;

    // Auto-detect: if pageId has a widget config, use widgets mode
    const hasWidgetConfig = pageId in PAGE_WIDGET_CONFIGS;
    const shouldUseWidgets = useWidgets ?? hasWidgetConfig;

    // If using widgets mode, don't pass children to let AppShellLayout render WidgetGrid
    if (shouldUseWidgets) {
        return (
            <AppShellLayout userLevel={userLevel} pageId={pageId}>
                {/* No children - AppShellLayout will render WidgetGrid */}
            </AppShellLayout>
        );
    }

    // Legacy mode: wrap children in a scrollable container
    return (
        <AppShellLayout userLevel={userLevel} pageId={pageId}>
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
