/**
 * Dashboard Configuration Service
 * User-customizable dashboard widget layouts
 */

import { Injectable, Logger } from '@nestjs/common';

export interface WidgetPlacement {
    widgetId: string;
    widgetType: string;
    position: { row: number; col: number };
    size: { width: number; height: number };
    settings?: Record<string, any>;
    visible: boolean;
}

export interface DashboardLayout {
    id: string;
    userId: string;
    name: string;
    widgets: WidgetPlacement[];
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WidgetDefinition {
    id: string;
    type: string;
    name: string;
    description: string;
    icon: string;
    defaultSize: { width: number; height: number };
    minSize: { width: number; height: number };
    maxSize: { width: number; height: number };
    configurable: boolean;
    configSchema?: Record<string, any>;
}

@Injectable()
export class DashboardConfigService {
    private readonly logger = new Logger(DashboardConfigService.name);

    // Available widgets
    private widgetDefinitions: WidgetDefinition[] = [
        {
            id: 'stats-overview',
            type: 'stats',
            name: '統計概覽',
            description: '顯示關鍵統計數據',
            icon: '📊',
            defaultSize: { width: 2, height: 1 },
            minSize: { width: 1, height: 1 },
            maxSize: { width: 4, height: 2 },
            configurable: true,
            configSchema: {
                metrics: { type: 'array', items: ['reports', 'sos', 'volunteers', 'tasks'] },
            },
        },
        {
            id: 'recent-activity',
            type: 'activity',
            name: '最近活動',
            description: '顯示最近系統活動',
            icon: '📝',
            defaultSize: { width: 2, height: 2 },
            minSize: { width: 2, height: 1 },
            maxSize: { width: 4, height: 4 },
            configurable: true,
        },
        {
            id: 'sos-monitor',
            type: 'sos',
            name: 'SOS 監控',
            description: '即時 SOS 警報監控',
            icon: '🚨',
            defaultSize: { width: 2, height: 2 },
            minSize: { width: 2, height: 2 },
            maxSize: { width: 4, height: 3 },
            configurable: false,
        },
        {
            id: 'weather-alerts',
            type: 'weather',
            name: '天氣警報',
            description: '顯示當前天氣警報',
            icon: '🌧️',
            defaultSize: { width: 2, height: 2 },
            minSize: { width: 1, height: 1 },
            maxSize: { width: 3, height: 3 },
            configurable: true,
        },
        {
            id: 'task-list',
            type: 'tasks',
            name: '待辦任務',
            description: '顯示待處理任務',
            icon: '✅',
            defaultSize: { width: 2, height: 2 },
            minSize: { width: 2, height: 1 },
            maxSize: { width: 4, height: 4 },
            configurable: true,
        },
        {
            id: 'map-preview',
            type: 'map',
            name: '地圖預覽',
            description: '災情地圖縮圖',
            icon: '🗺️',
            defaultSize: { width: 3, height: 3 },
            minSize: { width: 2, height: 2 },
            maxSize: { width: 4, height: 4 },
            configurable: true,
        },
        {
            id: 'quick-actions',
            type: 'actions',
            name: '快速操作',
            description: '常用功能快捷鍵',
            icon: '⚡',
            defaultSize: { width: 2, height: 1 },
            minSize: { width: 2, height: 1 },
            maxSize: { width: 4, height: 2 },
            configurable: true,
        },
        {
            id: 'analytics-chart',
            type: 'chart',
            name: '分析圖表',
            description: '數據趨勢圖表',
            icon: '📈',
            defaultSize: { width: 3, height: 2 },
            minSize: { width: 2, height: 2 },
            maxSize: { width: 4, height: 3 },
            configurable: true,
        },
    ];

    // User layouts storage
    private userLayouts: Map<string, DashboardLayout[]> = new Map();

    // ==================== Widget Definitions ====================

    /**
     * Get all available widget definitions
     */
    getAvailableWidgets(): WidgetDefinition[] {
        return this.widgetDefinitions;
    }

    /**
     * Get widget definition by ID
     */
    getWidgetDefinition(widgetId: string): WidgetDefinition | null {
        return this.widgetDefinitions.find(w => w.id === widgetId) || null;
    }

    // ==================== Layout Management ====================

    /**
     * Get user's dashboard layouts
     */
    getUserLayouts(userId: string): DashboardLayout[] {
        return this.userLayouts.get(userId) || [];
    }

    /**
     * Get user's active (default) layout
     */
    getActiveLayout(userId: string): DashboardLayout | null {
        const layouts = this.getUserLayouts(userId);
        return layouts.find(l => l.isDefault) || layouts[0] || this.getDefaultLayout(userId);
    }

    /**
     * Create new dashboard layout
     */
    createLayout(userId: string, name: string, widgets?: WidgetPlacement[]): DashboardLayout {
        const layout: DashboardLayout = {
            id: `layout-${Date.now()}`,
            userId,
            name,
            widgets: widgets || this.getDefaultWidgets(),
            isDefault: this.getUserLayouts(userId).length === 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const userLayoutList = this.userLayouts.get(userId) || [];
        userLayoutList.push(layout);
        this.userLayouts.set(userId, userLayoutList);

        this.logger.log(`Created dashboard layout: ${layout.id} for user ${userId}`);
        return layout;
    }

    /**
     * Update dashboard layout
     */
    updateLayout(userId: string, layoutId: string, updates: Partial<DashboardLayout>): DashboardLayout | null {
        const layouts = this.userLayouts.get(userId) || [];
        const index = layouts.findIndex(l => l.id === layoutId);

        if (index === -1) return null;

        layouts[index] = {
            ...layouts[index],
            ...updates,
            updatedAt: new Date(),
        };

        return layouts[index];
    }

    /**
     * Delete dashboard layout
     */
    deleteLayout(userId: string, layoutId: string): boolean {
        const layouts = this.userLayouts.get(userId) || [];
        const index = layouts.findIndex(l => l.id === layoutId);

        if (index === -1) return false;

        layouts.splice(index, 1);

        // If deleted layout was default, set first remaining as default
        if (layouts.length > 0 && !layouts.some(l => l.isDefault)) {
            layouts[0].isDefault = true;
        }

        return true;
    }

    /**
     * Set layout as default
     */
    setDefaultLayout(userId: string, layoutId: string): boolean {
        const layouts = this.userLayouts.get(userId) || [];

        layouts.forEach(l => {
            l.isDefault = l.id === layoutId;
        });

        return layouts.some(l => l.id === layoutId);
    }

    // ==================== Widget Placement ====================

    /**
     * Add widget to layout
     */
    addWidget(userId: string, layoutId: string, widget: WidgetPlacement): boolean {
        const layout = this.getUserLayouts(userId).find(l => l.id === layoutId);
        if (!layout) return false;

        layout.widgets.push(widget);
        layout.updatedAt = new Date();
        return true;
    }

    /**
     * Update widget placement
     */
    updateWidget(userId: string, layoutId: string, widgetId: string, updates: Partial<WidgetPlacement>): boolean {
        const layout = this.getUserLayouts(userId).find(l => l.id === layoutId);
        if (!layout) return false;

        const widget = layout.widgets.find(w => w.widgetId === widgetId);
        if (!widget) return false;

        Object.assign(widget, updates);
        layout.updatedAt = new Date();
        return true;
    }

    /**
     * Remove widget from layout
     */
    removeWidget(userId: string, layoutId: string, widgetId: string): boolean {
        const layout = this.getUserLayouts(userId).find(l => l.id === layoutId);
        if (!layout) return false;

        const index = layout.widgets.findIndex(w => w.widgetId === widgetId);
        if (index === -1) return false;

        layout.widgets.splice(index, 1);
        layout.updatedAt = new Date();
        return true;
    }

    // ==================== Private Helpers ====================

    private getDefaultLayout(userId: string): DashboardLayout {
        return {
            id: 'default',
            userId,
            name: '預設儀表板',
            widgets: this.getDefaultWidgets(),
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    private getDefaultWidgets(): WidgetPlacement[] {
        return [
            {
                widgetId: 'stats-1',
                widgetType: 'stats-overview',
                position: { row: 0, col: 0 },
                size: { width: 4, height: 1 },
                visible: true,
            },
            {
                widgetId: 'sos-1',
                widgetType: 'sos-monitor',
                position: { row: 1, col: 0 },
                size: { width: 2, height: 2 },
                visible: true,
            },
            {
                widgetId: 'activity-1',
                widgetType: 'recent-activity',
                position: { row: 1, col: 2 },
                size: { width: 2, height: 2 },
                visible: true,
            },
            {
                widgetId: 'tasks-1',
                widgetType: 'task-list',
                position: { row: 3, col: 0 },
                size: { width: 2, height: 2 },
                visible: true,
            },
            {
                widgetId: 'weather-1',
                widgetType: 'weather-alerts',
                position: { row: 3, col: 2 },
                size: { width: 2, height: 2 },
                visible: true,
            },
        ];
    }
}
