/**
 * Multi-Region Deployment Service
 * 多區域部署服務
 * 
 * P3 擴展性：支援跨區域容錯與故障轉移
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 區域配置
 */
export interface RegionConfig {
    id: string;
    name: string;
    location: string; // asia-east1, asia-northeast1, us-west1
    role: 'primary' | 'secondary' | 'dr';
    endpoint: string;
    healthEndpoint: string;
    readOnly: boolean;
    priority: number;
}

/**
 * 區域狀態
 */
export interface RegionStatus {
    regionId: string;
    healthy: boolean;
    latencyMs: number;
    lastCheck: Date;
    errorCount: number;
    activeConnections: number;
}

/**
 * 故障轉移事件
 */
export interface FailoverEvent {
    id: string;
    fromRegion: string;
    toRegion: string;
    reason: string;
    triggeredAt: Date;
    completedAt?: Date;
    success: boolean;
}

/**
 * 多區域部署服務
 */
@Injectable()
export class MultiRegionService {
    private readonly logger = new Logger(MultiRegionService.name);
    
    // 區域配置
    private regions: Map<string, RegionConfig> = new Map([
        ['asia-east1', {
            id: 'asia-east1',
            name: 'Taiwan',
            location: 'asia-east1',
            role: 'primary',
            endpoint: 'https://api.lightkeepers.tw',
            healthEndpoint: 'https://api.lightkeepers.tw/health',
            readOnly: false,
            priority: 1,
        }],
        ['asia-northeast1', {
            id: 'asia-northeast1',
            name: 'Japan',
            location: 'asia-northeast1',
            role: 'secondary',
            endpoint: 'https://api-jp.lightkeepers.tw',
            healthEndpoint: 'https://api-jp.lightkeepers.tw/health',
            readOnly: true,
            priority: 2,
        }],
        ['us-west1', {
            id: 'us-west1',
            name: 'US West (DR)',
            location: 'us-west1',
            role: 'dr',
            endpoint: 'https://api-dr.lightkeepers.tw',
            healthEndpoint: 'https://api-dr.lightkeepers.tw/health',
            readOnly: true,
            priority: 3,
        }],
    ]);
    
    // 區域狀態
    private regionStatus: Map<string, RegionStatus> = new Map();
    
    // 當前活躍區域
    private activeRegion: string = 'asia-east1';
    
    // 故障轉移歷史
    private failoverHistory: FailoverEvent[] = [];

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        // 初始化區域狀態
        for (const regionId of this.regions.keys()) {
            this.regionStatus.set(regionId, {
                regionId,
                healthy: true,
                latencyMs: 0,
                lastCheck: new Date(),
                errorCount: 0,
                activeConnections: 0,
            });
        }
    }

    /**
     * 取得當前活躍區域
     */
    getActiveRegion(): RegionConfig | undefined {
        return this.regions.get(this.activeRegion);
    }

    /**
     * 取得所有區域配置
     */
    getAllRegions(): RegionConfig[] {
        return Array.from(this.regions.values());
    }

    /**
     * 取得區域狀態
     */
    getRegionStatus(regionId: string): RegionStatus | undefined {
        return this.regionStatus.get(regionId);
    }

    /**
     * 取得所有區域狀態
     */
    getAllRegionStatus(): RegionStatus[] {
        return Array.from(this.regionStatus.values());
    }

    /**
     * 更新區域健康狀態
     */
    updateRegionHealth(regionId: string, healthy: boolean, latencyMs: number): void {
        const status = this.regionStatus.get(regionId);
        if (!status) return;

        status.healthy = healthy;
        status.latencyMs = latencyMs;
        status.lastCheck = new Date();
        
        if (!healthy) {
            status.errorCount++;
            this.logger.warn(`Region ${regionId} unhealthy, error count: ${status.errorCount}`);
            
            // 連續 3 次失敗觸發故障轉移
            if (status.errorCount >= 3 && regionId === this.activeRegion) {
                this.triggerFailover(regionId, 'consecutive_failures');
            }
        } else {
            status.errorCount = 0;
        }
    }

    /**
     * 觸發故障轉移
     */
    async triggerFailover(fromRegion: string, reason: string): Promise<FailoverEvent> {
        // 找到下一個健康的區域
        const nextRegion = this.findNextHealthyRegion(fromRegion);
        
        if (!nextRegion) {
            this.logger.error('No healthy region available for failover!');
            throw new Error('No healthy region available');
        }

        const event: FailoverEvent = {
            id: `failover_${Date.now()}`,
            fromRegion,
            toRegion: nextRegion.id,
            reason,
            triggeredAt: new Date(),
            success: false,
        };

        this.logger.warn(`Initiating failover: ${fromRegion} → ${nextRegion.id}`);

        try {
            // 更新活躍區域
            this.activeRegion = nextRegion.id;
            
            // 發送事件
            this.eventEmitter.emit('region.failover', {
                from: fromRegion,
                to: nextRegion.id,
                endpoint: nextRegion.endpoint,
            });

            event.completedAt = new Date();
            event.success = true;

            this.logger.log(`Failover successful: now using ${nextRegion.name}`);
        } catch (error) {
            this.logger.error(`Failover failed: ${error.message}`);
        }

        this.failoverHistory.push(event);
        return event;
    }

    /**
     * 手動切換區域
     */
    switchRegion(targetRegionId: string): boolean {
        const region = this.regions.get(targetRegionId);
        if (!region) return false;

        const status = this.regionStatus.get(targetRegionId);
        if (!status?.healthy) {
            this.logger.warn(`Cannot switch to unhealthy region: ${targetRegionId}`);
            return false;
        }

        const previousRegion = this.activeRegion;
        this.activeRegion = targetRegionId;

        this.failoverHistory.push({
            id: `manual_${Date.now()}`,
            fromRegion: previousRegion,
            toRegion: targetRegionId,
            reason: 'manual_switch',
            triggeredAt: new Date(),
            completedAt: new Date(),
            success: true,
        });

        this.logger.log(`Manual switch: ${previousRegion} → ${targetRegionId}`);
        return true;
    }

    /**
     * 取得最佳區域 (依延遲)
     */
    getBestRegion(): RegionConfig | undefined {
        const healthyRegions = Array.from(this.regions.entries())
            .filter(([id]) => this.regionStatus.get(id)?.healthy)
            .sort(([a], [b]) => {
                const statusA = this.regionStatus.get(a)!;
                const statusB = this.regionStatus.get(b)!;
                return statusA.latencyMs - statusB.latencyMs;
            });

        if (healthyRegions.length === 0) return undefined;
        return healthyRegions[0][1];
    }

    /**
     * 取得讀取端點 (可分散負載)
     */
    getReadEndpoint(): string {
        // 優先使用延遲最低的區域
        const best = this.getBestRegion();
        return best?.endpoint || this.regions.get(this.activeRegion)!.endpoint;
    }

    /**
     * 取得寫入端點 (只使用主要區域)
     */
    getWriteEndpoint(): string {
        const primary = Array.from(this.regions.values()).find(r => r.role === 'primary' && !r.readOnly);
        return primary?.endpoint || this.regions.get(this.activeRegion)!.endpoint;
    }

    /**
     * 取得故障轉移歷史
     */
    getFailoverHistory(): FailoverEvent[] {
        return [...this.failoverHistory];
    }

    /**
     * 取得部署摘要
     */
    getDeploymentSummary(): {
        activeRegion: string;
        totalRegions: number;
        healthyRegions: number;
        lastFailover?: FailoverEvent;
    } {
        const healthyCount = Array.from(this.regionStatus.values()).filter(s => s.healthy).length;
        const lastFailover = this.failoverHistory[this.failoverHistory.length - 1];

        return {
            activeRegion: this.activeRegion,
            totalRegions: this.regions.size,
            healthyRegions: healthyCount,
            lastFailover,
        };
    }

    /**
     * 模擬健康檢查 (實際應使用 HTTP 請求)
     */
    async checkAllRegionsHealth(): Promise<void> {
        for (const [regionId, region] of this.regions.entries()) {
            try {
                // 模擬健康檢查
                // const response = await fetch(region.healthEndpoint);
                const healthy = true; // 實際應檢查回應
                const latency = Math.random() * 100; // 模擬延遲

                this.updateRegionHealth(regionId, healthy, latency);
            } catch (error) {
                this.updateRegionHealth(regionId, false, 0);
            }
        }
    }

    // ==================== Private Helpers ====================

    private findNextHealthyRegion(excludeRegion: string): RegionConfig | undefined {
        const candidates = Array.from(this.regions.entries())
            .filter(([id]) => id !== excludeRegion && this.regionStatus.get(id)?.healthy)
            .sort(([, a], [, b]) => a.priority - b.priority);

        if (candidates.length === 0) return undefined;
        return candidates[0][1];
    }
}
