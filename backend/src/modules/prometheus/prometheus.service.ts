import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * Prometheus Metrics Service
 * Application performance monitoring and observability
 * 
 * Note: prom-client must be installed: npm install prom-client
 * For now we use in-memory mock implementation
 */
@Injectable()
export class PrometheusService implements OnModuleInit {
    private readonly logger = new Logger(PrometheusService.name);
    private metrics: Map<string, MetricData> = new Map();

    // In-memory metric stores
    private counters: Map<string, number> = new Map();
    private histograms: Map<string, number[]> = new Map();
    private gauges: Map<string, number> = new Map();

    onModuleInit() {
        this.initializeMetrics();
        this.logger.log('Prometheus metrics initialized (in-memory fallback)');
    }

    private initializeMetrics() {
        // Initialize default metrics
        this.registerCounter('http_requests_total', 'Total HTTP requests');
        this.registerHistogram('http_request_duration_seconds', 'HTTP request duration');
        this.registerHistogram('db_query_duration_seconds', 'Database query duration');
        this.registerCounter('incidents_created_total', 'Total incidents created');
        this.registerCounter('alerts_sent_total', 'Total alerts sent');
        this.registerCounter('volunteers_dispatched_total', 'Total volunteers dispatched');
        this.registerGauge('active_incidents', 'Current active incidents');
        this.registerGauge('online_volunteers', 'Currently online volunteers');
        this.registerGauge('active_geofences', 'Currently active geofences');
        this.registerGauge('system_memory_usage_bytes', 'System memory usage');
    }

    private registerCounter(name: string, help: string): void {
        this.metrics.set(name, { type: 'counter', help, labels: [] });
        this.counters.set(name, 0);
    }

    private registerHistogram(name: string, help: string): void {
        this.metrics.set(name, { type: 'histogram', help, labels: [] });
        this.histograms.set(name, []);
    }

    private registerGauge(name: string, help: string): void {
        this.metrics.set(name, { type: 'gauge', help, labels: [] });
        this.gauges.set(name, 0);
    }

    /**
     * 增加 Counter
     */
    inc(name: string, labels?: Record<string, string>, value: number = 1): void {
        const key = this.getKey(name, labels);
        this.counters.set(key, (this.counters.get(key) || 0) + value);
    }

    /**
     * 觀察 Histogram
     */
    observe(name: string, value: number, labels?: Record<string, string>): void {
        const key = this.getKey(name, labels);
        const arr = this.histograms.get(key) || [];
        arr.push(value);
        this.histograms.set(key, arr);
    }

    /**
     * 設定 Gauge
     */
    set(name: string, value: number, labels?: Record<string, string>): void {
        const key = this.getKey(name, labels);
        this.gauges.set(key, value);
    }

    private getKey(name: string, labels?: Record<string, string>): string {
        if (!labels) return name;
        const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
        return `${name}{${labelStr}}`;
    }

    /**
     * 取得 Prometheus 格式指標
     */
    async getMetrics(): Promise<string> {
        const lines: string[] = [];

        for (const [name, data] of this.metrics) {
            lines.push(`# HELP ${name} ${data.help}`);
            lines.push(`# TYPE ${name} ${data.type}`);
        }

        for (const [key, value] of this.counters) {
            lines.push(`${key} ${value}`);
        }

        for (const [key, value] of this.gauges) {
            lines.push(`${key} ${value}`);
        }

        // Add system metrics
        const mem = process.memoryUsage();
        lines.push(`process_memory_heap_bytes ${mem.heapUsed}`);
        lines.push(`process_memory_rss_bytes ${mem.rss}`);
        lines.push(`process_uptime_seconds ${process.uptime()}`);

        return lines.join('\n');
    }

    /**
     * 取得 JSON 格式指標
     */
    async getMetricsJson(): Promise<any> {
        return {
            counters: Object.fromEntries(this.counters),
            gauges: Object.fromEntries(this.gauges),
            histograms: Object.fromEntries(
                Array.from(this.histograms.entries()).map(([k, v]) => [k, {
                    count: v.length,
                    sum: v.reduce((a, b) => a + b, 0),
                    avg: v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0,
                }]),
            ),
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * 記錄 HTTP 請求
     */
    recordHttpRequest(method: string, path: string, status: number, duration: number) {
        this.inc('http_requests_total', { method, path, status: String(status) });
        this.observe('http_request_duration_seconds', duration / 1000, { method, path });
    }

    /**
     * 記錄資料庫查詢
     */
    recordDbQuery(operation: string, table: string, duration: number) {
        this.observe('db_query_duration_seconds', duration / 1000, { operation, table });
    }
}

interface MetricData { type: 'counter' | 'histogram' | 'gauge'; help: string; labels: string[]; }
