import { Injectable, Logger } from '@nestjs/common';
import { OfflineSyncService, OfflineOperation, SyncBatchResult, ConflictResolutionStrategy } from './services/offline-sync.service';
import { ApiVersioningService, ApiVersion, DeprecationWarning } from './services/api-versioning.service';
import { SlaMonitorService, SlaTarget, SlaMetric, SlaReport } from './services/sla-monitor.service';
import { CircuitBreakerService, CircuitConfig, CircuitStatus } from './services/circuit-breaker.service';
import { RateLimiterService, RateLimitConfig, RateLimitResult } from './services/rate-limiter.service';

/**
 * Scalability Service (Unified Facade)
 */
@Injectable()
export class ScalabilityService {
    private readonly logger = new Logger(ScalabilityService.name);

    constructor(
        private readonly offlineSync: OfflineSyncService,
        private readonly apiVersioning: ApiVersioningService,
        private readonly slaMonitor: SlaMonitorService,
        private readonly circuitBreaker: CircuitBreakerService,
        private readonly rateLimiter: RateLimiterService,
    ) {}

    // === Offline Sync ===

    queueOfflineOperation(data: any): OfflineOperation {
        return this.offlineSync.queueOperation(data);
    }

    async syncOfflineOperations(clientId: string): Promise<SyncBatchResult> {
        return this.offlineSync.syncBatch(clientId);
    }

    getPendingOperations(clientId: string): OfflineOperation[] {
        return this.offlineSync.getPendingOperations(clientId);
    }

    getConflictOperations(clientId: string): OfflineOperation[] {
        return this.offlineSync.getConflictOperations(clientId);
    }

    resolveConflict(operationId: string, resolution: 'use_client' | 'use_server' | 'merge', mergedData?: any): boolean {
        return this.offlineSync.resolveConflictManually(operationId, resolution, mergedData);
    }

    setConflictStrategy(strategy: ConflictResolutionStrategy): void {
        this.offlineSync.setConflictStrategy(strategy);
    }

    // === API Versioning ===

    getCurrentApiVersion(): string {
        return this.apiVersioning.getCurrentVersion();
    }

    getAllApiVersions(): ApiVersion[] {
        return this.apiVersioning.getAllVersions();
    }

    getApiVersion(version: string): ApiVersion | undefined {
        return this.apiVersioning.getVersion(version);
    }

    isApiVersionSupported(version: string): boolean {
        return this.apiVersioning.isVersionSupported(version);
    }

    getDeprecationWarning(path: string): DeprecationWarning | undefined {
        return this.apiVersioning.getDeprecationWarning(path);
    }

    negotiateApiVersion(requested: string, accept?: string) {
        return this.apiVersioning.negotiateVersion(requested, accept);
    }

    // === SLA Monitor ===

    async getSlaMetrics(): Promise<SlaMetric[]> {
        return this.slaMonitor.getCurrentMetrics();
    }

    getSlaTargets(): SlaTarget[] {
        return this.slaMonitor.getTargets();
    }

    generateSlaReport(hours?: number): SlaReport {
        return this.slaMonitor.generateReport(hours);
    }

    isSlaCompliant(): boolean {
        return this.slaMonitor.isCompliant();
    }

    // === Circuit Breaker ===

    registerCircuit(config: CircuitConfig): void {
        this.circuitBreaker.register(config);
    }

    async executeWithCircuit<T>(name: string, operation: () => Promise<T>, fallback?: () => T): Promise<T> {
        return this.circuitBreaker.execute(name, operation, fallback);
    }

    getCircuitStatus(name: string): CircuitStatus | null {
        return this.circuitBreaker.getStatus(name);
    }

    getAllCircuitStatus(): CircuitStatus[] {
        return this.circuitBreaker.getAllStatus();
    }

    resetCircuit(name: string): void {
        this.circuitBreaker.reset(name);
    }

    // === Rate Limiter ===

    checkRateLimit(limitName: string, key: string, count?: number): RateLimitResult {
        return this.rateLimiter.checkAndConsume(limitName, key, count);
    }

    getRateLimitRemaining(limitName: string, key: string): number {
        return this.rateLimiter.getRemaining(limitName, key);
    }

    getRateLimitConfigs(): RateLimitConfig[] {
        return this.rateLimiter.getConfigs();
    }

    updateRateLimitConfig(name: string, updates: Partial<RateLimitConfig>): boolean {
        return this.rateLimiter.updateConfig(name, updates);
    }

    resetRateLimit(limitName: string, key: string): void {
        this.rateLimiter.reset(limitName, key);
    }

    // === Health Overview ===

    async getSystemHealth(): Promise<{
        sla: { compliant: boolean; report: SlaReport };
        circuits: CircuitStatus[];
        rateLimits: RateLimitConfig[];
    }> {
        const slaReport = this.slaMonitor.generateReport(1);
        
        return {
            sla: {
                compliant: this.slaMonitor.isCompliant(),
                report: slaReport,
            },
            circuits: this.circuitBreaker.getAllStatus(),
            rateLimits: this.rateLimiter.getConfigs(),
        };
    }
}
