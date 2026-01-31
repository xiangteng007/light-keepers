import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface SlaTarget {
    name: string;
    metric: 'availability' | 'latency_p50' | 'latency_p95' | 'latency_p99' | 'error_rate' | 'throughput';
    target: number;
    unit: string;
    critical: boolean;
}

export interface SlaMetric {
    metric: string;
    value: number;
    target: number;
    unit: string;
    status: 'OK' | 'WARNING' | 'CRITICAL';
    timestamp: Date;
}

export interface SlaReport {
    period: { from: Date; to: Date };
    overallStatus: 'OK' | 'WARNING' | 'CRITICAL';
    compliance: number; // percentage
    metrics: SlaMetric[];
    violations: Array<{
        metric: string;
        timestamp: Date;
        value: number;
        target: number;
    }>;
}

/**
 * SLA Monitor Service
 * 
 * 監控服務水準協議：
 * - 可用性監控 (99.9%)
 * - 延遲監控 (P50/P95/P99)
 * - 錯誤率監控
 */
@Injectable()
export class SlaMonitorService {
    private readonly logger = new Logger(SlaMonitorService.name);

    // SLA 目標
    private readonly targets: SlaTarget[] = [
        { name: 'Availability', metric: 'availability', target: 99.9, unit: '%', critical: true },
        { name: 'Latency P50', metric: 'latency_p50', target: 100, unit: 'ms', critical: false },
        { name: 'Latency P95', metric: 'latency_p95', target: 500, unit: 'ms', critical: true },
        { name: 'Latency P99', metric: 'latency_p99', target: 1000, unit: 'ms', critical: true },
        { name: 'Error Rate', metric: 'error_rate', target: 0.1, unit: '%', critical: true },
        { name: 'Throughput', metric: 'throughput', target: 1000, unit: 'req/s', critical: false },
    ];

    // 指標歷史
    private metricsHistory: SlaMetric[] = [];
    private violations: Array<any> = [];

    /**
     * 每分鐘收集指標
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async collectMetrics(): Promise<void> {
        const metrics = await this.gatherMetrics();
        
        for (const metric of metrics) {
            this.metricsHistory.push(metric);
            
            if (metric.status === 'CRITICAL') {
                this.violations.push({
                    metric: metric.metric,
                    timestamp: metric.timestamp,
                    value: metric.value,
                    target: metric.target,
                });
                
                this.logger.warn(`SLA violation: ${metric.metric} = ${metric.value}${metric.unit} (target: ${metric.target}${metric.unit})`);
            }
        }

        // 保留最近 24 小時
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.metricsHistory = this.metricsHistory.filter(m => m.timestamp.getTime() > oneDayAgo);
        this.violations = this.violations.filter(v => v.timestamp.getTime() > oneDayAgo);
    }

    /**
     * 取得當前指標
     */
    async getCurrentMetrics(): Promise<SlaMetric[]> {
        return this.gatherMetrics();
    }

    /**
     * 取得 SLA 目標
     */
    getTargets(): SlaTarget[] {
        return this.targets;
    }

    /**
     * 生成 SLA 報告
     */
    generateReport(hours: number = 24): SlaReport {
        const now = new Date();
        const from = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const periodMetrics = this.metricsHistory.filter(m => m.timestamp >= from);
        const periodViolations = this.violations.filter(v => v.timestamp >= from);

        // 計算每個指標的平均值
        const aggregated = this.aggregateMetrics(periodMetrics);

        // 計算合規率
        const totalChecks = periodMetrics.length;
        const passedChecks = periodMetrics.filter(m => m.status === 'OK').length;
        const compliance = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

        // 決定整體狀態
        let overallStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
        if (periodViolations.some(v => this.targets.find(t => t.metric === v.metric)?.critical)) {
            overallStatus = 'CRITICAL';
        } else if (periodViolations.length > 0) {
            overallStatus = 'WARNING';
        }

        return {
            period: { from, to: now },
            overallStatus,
            compliance,
            metrics: aggregated,
            violations: periodViolations,
        };
    }

    /**
     * 檢查是否符合 SLA
     */
    isCompliant(): boolean {
        const report = this.generateReport(1); // 最近 1 小時
        return report.overallStatus === 'OK';
    }

    // === Private ===

    private async gatherMetrics(): Promise<SlaMetric[]> {
        const now = new Date();
        
        // 模擬指標收集（實際應從監控系統取得）
        return this.targets.map(target => {
            const value = this.simulateMetricValue(target);
            const status = this.evaluateStatus(target, value);
            
            return {
                metric: target.metric,
                value,
                target: target.target,
                unit: target.unit,
                status,
                timestamp: now,
            };
        });
    }

    private simulateMetricValue(target: SlaTarget): number {
        // 模擬通常正常，偶爾異常的指標值
        const base = target.target;
        const variance = Math.random() < 0.95 ? 0.1 : 0.3;
        
        switch (target.metric) {
            case 'availability':
                return Math.max(99, base - Math.random() * variance);
            case 'latency_p50':
            case 'latency_p95':
            case 'latency_p99':
                return base * (0.5 + Math.random() * variance);
            case 'error_rate':
                return Math.random() * variance * base;
            case 'throughput':
                return base * (0.8 + Math.random() * 0.4);
            default:
                return base;
        }
    }

    private evaluateStatus(target: SlaTarget, value: number): 'OK' | 'WARNING' | 'CRITICAL' {
        switch (target.metric) {
            case 'availability':
            case 'throughput':
                // 越高越好
                if (value >= target.target) return 'OK';
                if (value >= target.target * 0.95) return 'WARNING';
                return 'CRITICAL';

            case 'latency_p50':
            case 'latency_p95':
            case 'latency_p99':
            case 'error_rate':
                // 越低越好
                if (value <= target.target) return 'OK';
                if (value <= target.target * 1.5) return 'WARNING';
                return 'CRITICAL';

            default:
                return 'OK';
        }
    }

    private aggregateMetrics(metrics: SlaMetric[]): SlaMetric[] {
        const grouped = new Map<string, SlaMetric[]>();
        
        for (const m of metrics) {
            const arr = grouped.get(m.metric) || [];
            arr.push(m);
            grouped.set(m.metric, arr);
        }

        return Array.from(grouped.entries()).map(([metric, values]) => {
            const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
            const target = values[0]?.target || 0;
            const unit = values[0]?.unit || '';
            
            return {
                metric,
                value: Math.round(avg * 100) / 100,
                target,
                unit,
                status: this.evaluateStatus({ metric, target, unit } as SlaTarget, avg),
                timestamp: new Date(),
            };
        });
    }
}
