import { Injectable, Logger } from '@nestjs/common';

/**
 * Dashboard Builder Service
 * Custom dashboard layout configuration
 */
@Injectable()
export class DashboardBuilderService {
    private readonly logger = new Logger(DashboardBuilderService.name);
    private dashboards: Map<string, Dashboard> = new Map();
    private widgets: Map<string, WidgetDefinition> = new Map();

    constructor() {
        this.initializeWidgets();
    }

    private initializeWidgets() {
        const defaultWidgets: WidgetDefinition[] = [
            { id: 'kpi_active_events', name: 'Active Events', type: 'kpi', category: 'events', size: { w: 1, h: 1 } },
            { id: 'kpi_alerts', name: 'NCDR Alerts', type: 'kpi', category: 'alerts', size: { w: 1, h: 1 } },
            { id: 'kpi_volunteers', name: 'Available Volunteers', type: 'kpi', category: 'volunteers', size: { w: 1, h: 1 } },
            { id: 'chart_incidents', name: 'Incidents Trend', type: 'chart', category: 'analytics', size: { w: 2, h: 2 } },
            { id: 'map_overview', name: 'Map Overview', type: 'map', category: 'gis', size: { w: 2, h: 2 } },
            { id: 'list_alerts', name: 'Alert List', type: 'list', category: 'alerts', size: { w: 1, h: 2 } },
            { id: 'list_tasks', name: 'Task Queue', type: 'list', category: 'tasks', size: { w: 1, h: 2 } },
            { id: 'timeline', name: 'Event Timeline', type: 'timeline', category: 'events', size: { w: 3, h: 1 } },
        ];

        defaultWidgets.forEach((w) => this.widgets.set(w.id, w));
    }

    /**
     * 取得可用 Widget
     */
    getAvailableWidgets(): WidgetDefinition[] {
        return Array.from(this.widgets.values());
    }

    /**
     * 建立 Dashboard
     */
    createDashboard(userId: string, config: DashboardConfig): Dashboard {
        const dashboard: Dashboard = {
            id: `dash-${Date.now()}`,
            userId,
            name: config.name,
            layout: config.layout || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.dashboards.set(dashboard.id, dashboard);
        return dashboard;
    }

    /**
     * 取得使用者 Dashboards
     */
    getUserDashboards(userId: string): Dashboard[] {
        return Array.from(this.dashboards.values()).filter((d) => d.userId === userId);
    }

    /**
     * 更新 Layout
     */
    updateLayout(dashboardId: string, layout: WidgetPosition[]): Dashboard | null {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) return null;

        dashboard.layout = layout;
        dashboard.updatedAt = new Date();
        return dashboard;
    }

    /**
     * 新增 Widget
     */
    addWidget(dashboardId: string, widgetId: string, position: Position): Dashboard | null {
        const dashboard = this.dashboards.get(dashboardId);
        const widget = this.widgets.get(widgetId);
        if (!dashboard || !widget) return null;

        dashboard.layout.push({
            widgetId,
            x: position.x,
            y: position.y,
            w: widget.size.w,
            h: widget.size.h,
        });
        dashboard.updatedAt = new Date();
        return dashboard;
    }

    /**
     * 移除 Widget
     */
    removeWidget(dashboardId: string, widgetId: string): Dashboard | null {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) return null;

        dashboard.layout = dashboard.layout.filter((w) => w.widgetId !== widgetId);
        dashboard.updatedAt = new Date();
        return dashboard;
    }

    /**
     * 複製 Dashboard
     */
    cloneDashboard(dashboardId: string, newUserId: string): Dashboard | null {
        const original = this.dashboards.get(dashboardId);
        if (!original) return null;

        return this.createDashboard(newUserId, {
            name: `${original.name} (Copy)`,
            layout: [...original.layout],
        });
    }

    /**
     * 刪除 Dashboard
     */
    deleteDashboard(dashboardId: string): boolean {
        return this.dashboards.delete(dashboardId);
    }

    /**
     * 取得預設 Layout
     */
    getDefaultLayout(): WidgetPosition[] {
        return [
            { widgetId: 'kpi_active_events', x: 0, y: 0, w: 1, h: 1 },
            { widgetId: 'kpi_alerts', x: 1, y: 0, w: 1, h: 1 },
            { widgetId: 'kpi_volunteers', x: 2, y: 0, w: 1, h: 1 },
            { widgetId: 'map_overview', x: 0, y: 1, w: 2, h: 2 },
            { widgetId: 'list_alerts', x: 2, y: 1, w: 1, h: 2 },
        ];
    }
}

// Types
interface WidgetDefinition { id: string; name: string; type: string; category: string; size: { w: number; h: number }; }
interface Position { x: number; y: number; }
interface WidgetPosition extends Position { widgetId: string; w: number; h: number; }
interface DashboardConfig { name: string; layout?: WidgetPosition[]; }
interface Dashboard { id: string; userId: string; name: string; layout: WidgetPosition[]; createdAt: Date; updatedAt: Date; }
