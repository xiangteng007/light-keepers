import { Injectable, Logger } from '@nestjs/common';

export interface KpiDefinition {
    id: string;
    name: string;
    metric: string;
    thresholds: { warning: number; critical: number };
    aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min';
    timeWindow: '1h' | '24h' | '7d' | '30d';
}

export interface KpiValue {
    kpiId: string;
    value: number;
    status: 'normal' | 'warning' | 'critical';
    trend: 'up' | 'down' | 'stable';
    timestamp: Date;
}

export interface AlertRule {
    id: string;
    kpiId: string;
    condition: 'above' | 'below' | 'equals';
    threshold: number;
    notifyChannels: ('push' | 'email' | 'sms' | 'line')[];
    enabled: boolean;
}

export interface DashboardWidget {
    id: string;
    type: 'kpi' | 'chart' | 'table' | 'map' | 'timeline';
    title: string;
    dataSource: string;
    config: Record<string, any>;
    position: { x: number; y: number; w: number; h: number };
}

export interface Dashboard {
    id: string;
    name: string;
    description: string;
    widgets: DashboardWidget[];
    refreshInterval: number;
    createdBy: string;
    isPublic: boolean;
    createdAt: Date;
}

@Injectable()
export class DashboardAnalyticsService {
    private readonly logger = new Logger(DashboardAnalyticsService.name);
    private kpis: Map<string, KpiDefinition> = new Map();
    private kpiValues: Map<string, KpiValue[]> = new Map();
    private alertRules: Map<string, AlertRule> = new Map();
    private dashboards: Map<string, Dashboard> = new Map();

    // ===== KPI 定義管理 =====

    createKpi(data: Omit<KpiDefinition, 'id'>): KpiDefinition {
        const kpi: KpiDefinition = { ...data, id: `kpi-${Date.now()}` };
        this.kpis.set(kpi.id, kpi);
        this.logger.log(`Created KPI: ${kpi.name}`);
        return kpi;
    }

    getKpi(id: string): KpiDefinition | undefined {
        return this.kpis.get(id);
    }

    getAllKpis(): KpiDefinition[] {
        return Array.from(this.kpis.values());
    }

    updateKpi(id: string, updates: Partial<KpiDefinition>): KpiDefinition | null {
        const kpi = this.kpis.get(id);
        if (!kpi) return null;
        Object.assign(kpi, updates);
        return kpi;
    }

    deleteKpi(id: string): boolean {
        return this.kpis.delete(id);
    }

    // ===== KPI 值計算 =====

    recordKpiValue(kpiId: string, value: number): KpiValue {
        const kpi = this.kpis.get(kpiId);
        if (!kpi) throw new Error('KPI not found');

        const status = this.calculateStatus(value, kpi.thresholds);
        const history = this.kpiValues.get(kpiId) || [];
        const lastValue = history[history.length - 1];
        const trend = this.calculateTrend(value, lastValue?.value);

        const kpiValue: KpiValue = {
            kpiId,
            value,
            status,
            trend,
            timestamp: new Date(),
        };

        history.push(kpiValue);
        if (history.length > 1000) history.shift();
        this.kpiValues.set(kpiId, history);

        // 檢查警報
        this.checkAlerts(kpiValue);

        return kpiValue;
    }

    getKpiHistory(kpiId: string, limit: number = 100): KpiValue[] {
        const history = this.kpiValues.get(kpiId) || [];
        return history.slice(-limit);
    }

    getCurrentValues(): KpiValue[] {
        const current: KpiValue[] = [];
        this.kpiValues.forEach((history) => {
            if (history.length > 0) {
                current.push(history[history.length - 1]);
            }
        });
        return current;
    }

    private calculateStatus(value: number, thresholds: { warning: number; critical: number }): 'normal' | 'warning' | 'critical' {
        if (value >= thresholds.critical) return 'critical';
        if (value >= thresholds.warning) return 'warning';
        return 'normal';
    }

    private calculateTrend(current: number, previous?: number): 'up' | 'down' | 'stable' {
        if (!previous) return 'stable';
        const change = (current - previous) / previous;
        if (change > 0.05) return 'up';
        if (change < -0.05) return 'down';
        return 'stable';
    }

    // ===== 警報規則 =====

    createAlertRule(data: Omit<AlertRule, 'id'>): AlertRule {
        const rule: AlertRule = { ...data, id: `ar-${Date.now()}` };
        this.alertRules.set(rule.id, rule);
        return rule;
    }

    getAlertRules(): AlertRule[] {
        return Array.from(this.alertRules.values());
    }

    updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
        const rule = this.alertRules.get(id);
        if (!rule) return null;
        Object.assign(rule, updates);
        return rule;
    }

    deleteAlertRule(id: string): boolean {
        return this.alertRules.delete(id);
    }

    private checkAlerts(kpiValue: KpiValue): void {
        const rules = Array.from(this.alertRules.values())
            .filter(r => r.kpiId === kpiValue.kpiId && r.enabled);

        for (const rule of rules) {
            let triggered = false;
            switch (rule.condition) {
                case 'above': triggered = kpiValue.value > rule.threshold; break;
                case 'below': triggered = kpiValue.value < rule.threshold; break;
                case 'equals': triggered = kpiValue.value === rule.threshold; break;
            }
            if (triggered) {
                this.logger.warn(`Alert triggered: KPI ${kpiValue.kpiId} ${rule.condition} ${rule.threshold}`);
                // TODO: 發送通知到 rule.notifyChannels
            }
        }
    }

    // ===== 儀表板管理 =====

    createDashboard(data: Omit<Dashboard, 'id' | 'createdAt'>): Dashboard {
        const dashboard: Dashboard = {
            ...data,
            id: `db-${Date.now()}`,
            createdAt: new Date(),
        };
        this.dashboards.set(dashboard.id, dashboard);
        return dashboard;
    }

    getDashboard(id: string): Dashboard | undefined {
        return this.dashboards.get(id);
    }

    getAllDashboards(userId?: string): Dashboard[] {
        return Array.from(this.dashboards.values())
            .filter(d => d.isPublic || d.createdBy === userId);
    }

    updateDashboard(id: string, updates: Partial<Dashboard>): Dashboard | null {
        const dashboard = this.dashboards.get(id);
        if (!dashboard) return null;
        Object.assign(dashboard, updates);
        return dashboard;
    }

    deleteDashboard(id: string): boolean {
        return this.dashboards.delete(id);
    }

    addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): DashboardWidget | null {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) return null;

        const newWidget: DashboardWidget = { ...widget, id: `w-${Date.now()}` };
        dashboard.widgets.push(newWidget);
        return newWidget;
    }

    removeWidget(dashboardId: string, widgetId: string): boolean {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) return false;

        const index = dashboard.widgets.findIndex(w => w.id === widgetId);
        if (index === -1) return false;

        dashboard.widgets.splice(index, 1);
        return true;
    }

    // ===== 資料聚合分析 =====

    getAggregatedData(
        dataSource: string,
        aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min',
        groupBy?: string,
        timeRange?: { start: Date; end: Date }
    ): Record<string, number> {
        // 模擬聚合資料
        return {
            total: Math.floor(Math.random() * 1000),
            average: Math.random() * 100,
            peak: Math.floor(Math.random() * 500),
        };
    }

    getTimeSeriesData(
        dataSource: string,
        interval: '1m' | '5m' | '1h' | '1d',
        points: number = 24
    ): { timestamp: Date; value: number }[] {
        const data: { timestamp: Date; value: number }[] = [];
        const now = Date.now();
        const intervalMs = interval === '1m' ? 60000 : interval === '5m' ? 300000 : interval === '1h' ? 3600000 : 86400000;

        for (let i = points - 1; i >= 0; i--) {
            data.push({
                timestamp: new Date(now - i * intervalMs),
                value: Math.random() * 100,
            });
        }
        return data;
    }
}
