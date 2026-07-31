/**
 * PageWrapper.tsx
 *
 * Wraps page components within AppShellLayout.
 *
 * Three explicit modes (evaluated in this order):
 * 1. Legacy Mode  — `children` provided: rendered inside a scrollable container.
 * 2. Widget Mode  — no children, `pageId` has an entry in PAGE_WIDGET_CONFIGS
 *                   (or `useWidgets` is forced true): AppShellLayout renders
 *                   the WidgetGrid for that page.
 * 3. Placeholder  — no children AND no widget config: previously this rendered
 *                   a silently blank shell. It now renders an explicit
 *                   "頁面建置中" EmptyState and warns loudly in dev.
 */
import React from 'react';
import { Construction } from 'lucide-react';
import AppShellLayout from './AppShellLayout';
import { PermissionLevel, PAGE_WIDGET_CONFIGS } from './widget.types';
import { useAuth } from '../../context/AuthContext';
import { isDevModeUser } from '../../utils/devMode';
import EmptyState from '../shared/EmptyState';
import './PageWrapper.css';

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
    // 🔧 DevMode: Use SystemOwner level to show all sidebar items
    // ⚠️ DEV build 專用 — production build 中 isDevModeUser() 會被 tree-shaking 成 false
    const devModeEnabled = isDevModeUser();
    const userLevel = devModeEnabled
        ? PermissionLevel.SystemOwner
        : (user?.roleLevel as PermissionLevel) ?? PermissionLevel.Guest;

    // Auto-detect: if pageId has a widget config, use widgets mode
    // BUT: if children are explicitly provided, prioritize rendering them (legacy mode)
    const hasWidgetConfig = pageId in PAGE_WIDGET_CONFIGS;
    const hasChildren = children !== undefined && children !== null;

    // Priority: children > explicit useWidgets prop > hasWidgetConfig
    const shouldUseWidgets = hasChildren ? false : (useWidgets ?? hasWidgetConfig);

    // Nothing to render: no page content and no widget layout registered for
    // this pageId. Surface it instead of shipping a blank screen.
    const isUnbuiltPage = !hasChildren && !hasWidgetConfig;

    React.useEffect(() => {
        if (isUnbuiltPage && import.meta.env.DEV) {
            console.warn(
                `[PageWrapper] pageId "${pageId}" 沒有 children，也沒有對應的 PAGE_WIDGET_CONFIGS 設定 —— ` +
                `頁面將顯示「頁面建置中」佔位內容。\n` +
                `修正方式：於 src/components/layout/widget/pageConfigs/ 新增 "${pageId}" 的 widget 配置，` +
                `或改為傳入 children 元件。`
            );
        }
    }, [isUnbuiltPage, pageId]);

    if (isUnbuiltPage) {
        return (
            <AppShellLayout userLevel={userLevel} pageId={pageId}>
                <div className="page-content page-content--placeholder">
                    <EmptyState
                        icon={Construction}
                        variant="minimal"
                        title="頁面建置中"
                        description={`此頁面（${pageId}）尚未設定內容，功能開發中，敬請期待。`}
                    />
                </div>
            </AppShellLayout>
        );
    }

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
            <div className="page-content">
                {children}
            </div>
        </AppShellLayout>
    );
}
