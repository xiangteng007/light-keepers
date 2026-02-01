/**
 * Mesh Node Health Service
 * 網狀節點健康監控服務
 * 
 * Phase 4 進階功能：
 * - 30 秒心跳檢測
 * - 自動發現鄰近節點
 * - 路由優化 (最少跳接)
 * - 弱訊號告警
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 節點狀態
 */
export enum NodeStatus {
    ONLINE = 'online',
    DEGRADED = 'degraded',
    OFFLINE = 'offline',
    UNKNOWN = 'unknown',
}

/**
 * 訊號強度等級
 */
export enum SignalStrength {
    EXCELLENT = 'excellent',  // > -50 dBm
    GOOD = 'good',           // -50 to -70 dBm
    FAIR = 'fair',           // -70 to -85 dBm
    WEAK = 'weak',           // -85 to -100 dBm
    CRITICAL = 'critical',   // < -100 dBm
}

/**
 * 網狀節點資訊
 */
export interface MeshNodeInfo {
    id: string;
    name: string;
    type: 'relay' | 'endpoint' | 'gateway';
    status: NodeStatus;
    lastHeartbeat: Date;
    signalDbm: number;
    signalStrength: SignalStrength;
    batteryLevel?: number;
    location?: { lat: number; lng: number };
    neighbors: string[];
    hopCount: number;
    packetLoss: number;
    latencyMs: number;
}

/**
 * 路由資訊
 */
export interface RouteInfo {
    from: string;
    to: string;
    path: string[];
    hopCount: number;
    totalLatencyMs: number;
    reliability: number;
}

/**
 * 健康警報
 */
export interface HealthAlert {
    id: string;
    nodeId: string;
    type: 'offline' | 'weak_signal' | 'high_latency' | 'packet_loss' | 'low_battery';
    severity: 'warning' | 'critical';
    message: string;
    detectedAt: Date;
    resolvedAt?: Date;
}

/**
 * Mesh 節點健康服務
 */
@Injectable()
export class MeshHealthService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MeshHealthService.name);
    
    // 節點登錄
    private nodes: Map<string, MeshNodeInfo> = new Map();
    
    // 路由表
    private routeTable: Map<string, RouteInfo[]> = new Map();
    
    // 健康警報
    private activeAlerts: HealthAlert[] = [];
    
    // 心跳間隔
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    
    // 配置
    private config = {
        heartbeatIntervalMs: 30000,      // 30 秒心跳
        offlineThresholdMs: 90000,       // 90 秒無心跳視為離線
        weakSignalThresholdDbm: -85,     // 弱訊號閾值
        criticalSignalThresholdDbm: -100, // 危急訊號閾值
        highLatencyThresholdMs: 5000,    // 高延遲閾值
        packetLossThreshold: 0.2,        // 20% 封包遺失
        lowBatteryThreshold: 0.15,       // 15% 電量
    };

    constructor(private readonly eventEmitter: EventEmitter2) {}

    async onModuleInit(): Promise<void> {
        // 啟動心跳檢測
        this.heartbeatInterval = setInterval(
            () => this.checkAllNodesHealth(),
            this.config.heartbeatIntervalMs
        );
        this.logger.log('Mesh health monitoring started');
    }

    async onModuleDestroy(): Promise<void> {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }

    // ==================== 節點管理 ====================

    /**
     * 註冊節點
     */
    registerNode(node: Omit<MeshNodeInfo, 'status' | 'lastHeartbeat' | 'signalStrength'>): MeshNodeInfo {
        const fullNode: MeshNodeInfo = {
            ...node,
            status: NodeStatus.ONLINE,
            lastHeartbeat: new Date(),
            signalStrength: this.getSignalStrength(node.signalDbm),
        };

        this.nodes.set(node.id, fullNode);
        this.logger.log(`Node registered: ${node.name} (${node.id})`);

        // 更新路由
        this.recalculateRoutes();

        return fullNode;
    }

    /**
     * 處理心跳
     */
    handleHeartbeat(nodeId: string, data: {
        signalDbm: number;
        batteryLevel?: number;
        location?: { lat: number; lng: number };
        neighbors: string[];
        latencyMs: number;
        packetLoss: number;
    }): boolean {
        const node = this.nodes.get(nodeId);
        if (!node) return false;

        const previousStatus = node.status;
        
        // 更新節點資訊
        node.lastHeartbeat = new Date();
        node.signalDbm = data.signalDbm;
        node.signalStrength = this.getSignalStrength(data.signalDbm);
        node.batteryLevel = data.batteryLevel;
        node.location = data.location;
        node.neighbors = data.neighbors;
        node.latencyMs = data.latencyMs;
        node.packetLoss = data.packetLoss;

        // 更新狀態
        node.status = this.determineNodeStatus(node);

        // 狀態變化通知
        if (previousStatus !== node.status) {
            this.eventEmitter.emit('mesh.node.status_changed', {
                nodeId,
                from: previousStatus,
                to: node.status,
            });
        }

        // 檢查警報條件
        this.checkNodeAlerts(node);

        return true;
    }

    /**
     * 取得節點資訊
     */
    getNode(nodeId: string): MeshNodeInfo | undefined {
        return this.nodes.get(nodeId);
    }

    /**
     * 取得所有節點
     */
    getAllNodes(): MeshNodeInfo[] {
        return Array.from(this.nodes.values());
    }

    /**
     * 取得在線節點
     */
    getOnlineNodes(): MeshNodeInfo[] {
        return this.getAllNodes().filter(n => n.status === NodeStatus.ONLINE);
    }

    // ==================== 路由管理 ====================

    /**
     * 取得最佳路由
     */
    getBestRoute(from: string, to: string): RouteInfo | undefined {
        const key = `${from}->${to}`;
        const routes = this.routeTable.get(key);
        
        if (!routes || routes.length === 0) return undefined;

        // 依 hop count 和 reliability 排序
        return routes.sort((a, b) => {
            // 優先最少跳接
            if (a.hopCount !== b.hopCount) {
                return a.hopCount - b.hopCount;
            }
            // 次優先最高可靠性
            return b.reliability - a.reliability;
        })[0];
    }

    /**
     * 取得所有路由
     */
    getRoutes(from: string): RouteInfo[] {
        const result: RouteInfo[] = [];
        for (const [key, routes] of this.routeTable.entries()) {
            if (key.startsWith(`${from}->`)) {
                result.push(...routes);
            }
        }
        return result;
    }

    /**
     * 重新計算路由 (Dijkstra)
     */
    private recalculateRoutes(): void {
        this.routeTable.clear();
        const onlineNodes = this.getOnlineNodes();

        for (const source of onlineNodes) {
            for (const target of onlineNodes) {
                if (source.id === target.id) continue;

                const route = this.findShortestPath(source.id, target.id);
                if (route) {
                    const key = `${source.id}->${target.id}`;
                    this.routeTable.set(key, [route]);
                }
            }
        }
    }

    /**
     * 尋找最短路徑 (BFS)
     */
    private findShortestPath(from: string, to: string): RouteInfo | undefined {
        const visited = new Set<string>();
        const queue: Array<{ nodeId: string; path: string[] }> = [
            { nodeId: from, path: [from] }
        ];

        while (queue.length > 0) {
            const { nodeId, path } = queue.shift()!;

            if (nodeId === to) {
                return {
                    from,
                    to,
                    path,
                    hopCount: path.length - 1,
                    totalLatencyMs: this.calculatePathLatency(path),
                    reliability: this.calculatePathReliability(path),
                };
            }

            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            const node = this.nodes.get(nodeId);
            if (!node) continue;

            for (const neighbor of node.neighbors) {
                if (!visited.has(neighbor) && this.nodes.get(neighbor)?.status === NodeStatus.ONLINE) {
                    queue.push({ nodeId: neighbor, path: [...path, neighbor] });
                }
            }
        }

        return undefined;
    }

    private calculatePathLatency(path: string[]): number {
        let total = 0;
        for (const nodeId of path) {
            const node = this.nodes.get(nodeId);
            if (node) total += node.latencyMs;
        }
        return total;
    }

    private calculatePathReliability(path: string[]): number {
        let reliability = 1;
        for (const nodeId of path) {
            const node = this.nodes.get(nodeId);
            if (node) reliability *= (1 - node.packetLoss);
        }
        return reliability;
    }

    // ==================== 健康檢查 ====================

    /**
     * 檢查所有節點健康
     */
    private checkAllNodesHealth(): void {
        const now = Date.now();

        for (const node of this.nodes.values()) {
            const timeSinceHeartbeat = now - node.lastHeartbeat.getTime();

            // 檢查離線
            if (timeSinceHeartbeat > this.config.offlineThresholdMs) {
                if (node.status !== NodeStatus.OFFLINE) {
                    node.status = NodeStatus.OFFLINE;
                    this.createAlert(node.id, 'offline', 'critical', `Node ${node.name} is offline`);
                    this.eventEmitter.emit('mesh.node.offline', { nodeId: node.id });
                }
            }
        }

        // 重新計算路由 (如有節點狀態變化)
        this.recalculateRoutes();
    }

    /**
     * 檢查節點警報條件
     */
    private checkNodeAlerts(node: MeshNodeInfo): void {
        // 弱訊號
        if (node.signalDbm < this.config.criticalSignalThresholdDbm) {
            this.createAlert(node.id, 'weak_signal', 'critical', 
                `Critical signal: ${node.signalDbm} dBm`);
        } else if (node.signalDbm < this.config.weakSignalThresholdDbm) {
            this.createAlert(node.id, 'weak_signal', 'warning',
                `Weak signal: ${node.signalDbm} dBm`);
        }

        // 高延遲
        if (node.latencyMs > this.config.highLatencyThresholdMs) {
            this.createAlert(node.id, 'high_latency', 'warning',
                `High latency: ${node.latencyMs}ms`);
        }

        // 封包遺失
        if (node.packetLoss > this.config.packetLossThreshold) {
            this.createAlert(node.id, 'packet_loss', 'warning',
                `Packet loss: ${(node.packetLoss * 100).toFixed(1)}%`);
        }

        // 低電量
        if (node.batteryLevel !== undefined && node.batteryLevel < this.config.lowBatteryThreshold) {
            this.createAlert(node.id, 'low_battery', 'critical',
                `Low battery: ${(node.batteryLevel * 100).toFixed(0)}%`);
        }
    }

    /**
     * 創建警報
     */
    private createAlert(
        nodeId: string,
        type: HealthAlert['type'],
        severity: HealthAlert['severity'],
        message: string,
    ): void {
        // 檢查是否已有相同警報
        const existing = this.activeAlerts.find(a => 
            a.nodeId === nodeId && a.type === type && !a.resolvedAt
        );
        if (existing) return;

        const alert: HealthAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            nodeId,
            type,
            severity,
            message,
            detectedAt: new Date(),
        };

        this.activeAlerts.push(alert);
        this.eventEmitter.emit('mesh.alert', alert);
        this.logger.warn(`Alert: ${message}`);
    }

    /**
     * 取得作用中警報
     */
    getActiveAlerts(): HealthAlert[] {
        return this.activeAlerts.filter(a => !a.resolvedAt);
    }

    /**
     * 解除警報
     */
    resolveAlert(alertId: string): boolean {
        const alert = this.activeAlerts.find(a => a.id === alertId);
        if (!alert || alert.resolvedAt) return false;

        alert.resolvedAt = new Date();
        this.logger.log(`Alert resolved: ${alertId}`);
        return true;
    }

    // ==================== 統計 ====================

    /**
     * 取得網路健康摘要
     */
    getNetworkHealth(): {
        totalNodes: number;
        onlineNodes: number;
        degradedNodes: number;
        offlineNodes: number;
        averageLatencyMs: number;
        averagePacketLoss: number;
        activeAlerts: number;
    } {
        const nodes = this.getAllNodes();
        const onlineNodes = nodes.filter(n => n.status === NodeStatus.ONLINE);

        return {
            totalNodes: nodes.length,
            onlineNodes: onlineNodes.length,
            degradedNodes: nodes.filter(n => n.status === NodeStatus.DEGRADED).length,
            offlineNodes: nodes.filter(n => n.status === NodeStatus.OFFLINE).length,
            averageLatencyMs: onlineNodes.length > 0
                ? onlineNodes.reduce((sum, n) => sum + n.latencyMs, 0) / onlineNodes.length
                : 0,
            averagePacketLoss: onlineNodes.length > 0
                ? onlineNodes.reduce((sum, n) => sum + n.packetLoss, 0) / onlineNodes.length
                : 0,
            activeAlerts: this.getActiveAlerts().length,
        };
    }

    // ==================== Private Helpers ====================

    private getSignalStrength(dbm: number): SignalStrength {
        if (dbm > -50) return SignalStrength.EXCELLENT;
        if (dbm > -70) return SignalStrength.GOOD;
        if (dbm > -85) return SignalStrength.FAIR;
        if (dbm > -100) return SignalStrength.WEAK;
        return SignalStrength.CRITICAL;
    }

    private determineNodeStatus(node: MeshNodeInfo): NodeStatus {
        if (node.signalDbm < this.config.criticalSignalThresholdDbm) {
            return NodeStatus.DEGRADED;
        }
        if (node.packetLoss > this.config.packetLossThreshold) {
            return NodeStatus.DEGRADED;
        }
        if (node.latencyMs > this.config.highLatencyThresholdMs) {
            return NodeStatus.DEGRADED;
        }
        return NodeStatus.ONLINE;
    }
}
