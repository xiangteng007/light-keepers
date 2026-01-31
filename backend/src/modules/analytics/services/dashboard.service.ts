import { Injectable, Logger } from '@nestjs/common';

export interface DashboardWidget {
    id: string;
    type: 'metric' | 'chart' | 'map' | 'table' | 'text';
    title: string;
    position: { x: number; y: number; w: number; h: number };
    config: Record<string, any>;
    datasource?: string;
    refreshInterval?: number;
}

export interface Dashboard {
    id: string;
    name: string;
    description?: string;
    widgets: DashboardWidget[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic: boolean;
}

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);
    private dashboards: Map<string, Dashboard> = new Map();

    create(data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
        const dashboard: Dashboard = {
            ...data,
            id: `dash-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.dashboards.set(dashboard.id, dashboard);
        return dashboard;
    }

    findAll(): Dashboard[] {
        return Array.from(this.dashboards.values());
    }

    findById(id: string): Dashboard | undefined {
        return this.dashboards.get(id);
    }

    update(id: string, updates: Partial<Dashboard>): Dashboard | null {
        const dashboard = this.dashboards.get(id);
        if (!dashboard) return null;
        const updated = { ...dashboard, ...updates, updatedAt: new Date() };
        this.dashboards.set(id, updated);
        return updated;
    }

    delete(id: string): boolean {
        return this.dashboards.delete(id);
    }

    addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): DashboardWidget | null {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) return null;
        
        const newWidget: DashboardWidget = { ...widget, id: `widget-${Date.now()}` };
        dashboard.widgets.push(newWidget);
        dashboard.updatedAt = new Date();
        return newWidget;
    }

    removeWidget(dashboardId: string, widgetId: string): boolean {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) return false;
        
        const idx = dashboard.widgets.findIndex(w => w.id === widgetId);
        if (idx === -1) return false;
        
        dashboard.widgets.splice(idx, 1);
        dashboard.updatedAt = new Date();
        return true;
    }
}
