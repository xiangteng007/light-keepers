/**
 * Event Externalization Service (Pub/Sub)
 * 事件外部化服務
 * 
 * P3 擴展性：透過 Pub/Sub 實現事件驅動架構
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

/**
 * 事件主題
 */
export enum EventTopic {
    // 任務相關
    MISSION_CREATED = 'mission.created',
    MISSION_UPDATED = 'mission.updated',
    MISSION_COMPLETED = 'mission.completed',
    
    // 資源相關
    RESOURCE_ALLOCATED = 'resource.allocated',
    RESOURCE_DEPLETED = 'resource.depleted',
    RESOURCE_REQUESTED = 'resource.requested',
    
    // 警報相關
    ALERT_ISSUED = 'alert.issued',
    ALERT_ESCALATED = 'alert.escalated',
    ALERT_RESOLVED = 'alert.resolved',
    
    // 人員相關
    VOLUNTEER_DISPATCHED = 'volunteer.dispatched',
    VOLUNTEER_CHECK_IN = 'volunteer.check_in',
    VOLUNTEER_SOS = 'volunteer.sos',
    
    // AI 相關
    AI_DECISION_PENDING = 'ai.decision.pending',
    AI_DECISION_APPROVED = 'ai.decision.approved',
    
    // 系統相關
    SYSTEM_HEALTH = 'system.health',
    REGION_FAILOVER = 'region.failover',
}

/**
 * 外部化事件
 */
export interface ExternalEvent {
    id: string;
    topic: EventTopic;
    source: string;
    timestamp: Date;
    payload: any;
    attributes: Record<string, string>;
    publishedAt?: Date;
    ack?: boolean;
}

/**
 * 訂閱配置
 */
export interface SubscriptionConfig {
    name: string;
    topic: EventTopic;
    handler: (event: ExternalEvent) => Promise<void>;
    deadLetterTopic?: string;
    ackDeadlineSeconds?: number;
}

/**
 * 事件外部化服務
 */
@Injectable()
export class EventExternalizationService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EventExternalizationService.name);
    
    // 事件佇列 (模擬 Pub/Sub)
    private eventQueue: Map<EventTopic, ExternalEvent[]> = new Map();
    
    // 訂閱者
    private subscriptions: SubscriptionConfig[] = [];
    
    // 發布統計
    private publishStats = {
        total: 0,
        successful: 0,
        failed: 0,
        byTopic: new Map<EventTopic, number>(),
    };
    
    // 處理中訊息
    private processingMessages: Set<string> = new Set();
    
    // 輪詢 interval
    private pollInterval: ReturnType<typeof setInterval> | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        // 初始化佇列
        for (const topic of Object.values(EventTopic)) {
            this.eventQueue.set(topic as EventTopic, []);
        }
    }

    async onModuleInit(): Promise<void> {
        // 啟動輪詢
        this.pollInterval = setInterval(() => this.processSubscriptions(), 1000);
        this.logger.log('Event externalization service started');
    }

    async onModuleDestroy(): Promise<void> {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }

    // ==================== 發布 ====================

    /**
     * 發布事件到 Pub/Sub
     */
    async publish(
        topic: EventTopic,
        payload: any,
        attributes: Record<string, string> = {},
    ): Promise<string> {
        const event: ExternalEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            topic,
            source: this.configService.get('SERVICE_NAME', 'light-keepers'),
            timestamp: new Date(),
            payload,
            attributes: {
                environment: this.configService.get('NODE_ENV', 'development'),
                ...attributes,
            },
        };

        try {
            // 加入佇列
            const queue = this.eventQueue.get(topic) || [];
            queue.push(event);
            this.eventQueue.set(topic, queue);

            event.publishedAt = new Date();
            
            // 更新統計
            this.publishStats.total++;
            this.publishStats.successful++;
            this.publishStats.byTopic.set(
                topic,
                (this.publishStats.byTopic.get(topic) || 0) + 1
            );

            this.logger.debug(`Published: ${topic} (${event.id})`);

            return event.id;
        } catch (error) {
            this.publishStats.failed++;
            this.logger.error(`Publish failed: ${topic} - ${error.message}`);
            throw error;
        }
    }

    /**
     * 批次發布
     */
    async publishBatch(events: Array<{ topic: EventTopic; payload: any }>): Promise<string[]> {
        const ids: string[] = [];
        
        for (const event of events) {
            const id = await this.publish(event.topic, event.payload);
            ids.push(id);
        }

        return ids;
    }

    // ==================== 訂閱 ====================

    /**
     * 訂閱主題
     */
    subscribe(config: SubscriptionConfig): void {
        this.subscriptions.push(config);
        this.logger.log(`Subscribed: ${config.name} → ${config.topic}`);
    }

    /**
     * 取消訂閱
     */
    unsubscribe(name: string): boolean {
        const index = this.subscriptions.findIndex(s => s.name === name);
        if (index === -1) return false;
        
        this.subscriptions.splice(index, 1);
        this.logger.log(`Unsubscribed: ${name}`);
        return true;
    }

    /**
     * 處理訂閱 (模擬 pull-based)
     */
    private async processSubscriptions(): Promise<void> {
        for (const sub of this.subscriptions) {
            const queue = this.eventQueue.get(sub.topic) || [];
            
            for (const event of queue) {
                if (event.ack) continue;
                if (this.processingMessages.has(event.id)) continue;

                this.processingMessages.add(event.id);

                try {
                    await sub.handler(event);
                    event.ack = true;
                    this.logger.debug(`Processed: ${event.id} by ${sub.name}`);
                } catch (error) {
                    this.logger.error(`Handler error: ${sub.name} - ${error.message}`);
                    
                    // 移到 dead letter
                    if (sub.deadLetterTopic) {
                        await this.publish(sub.deadLetterTopic as EventTopic, {
                            originalEvent: event,
                            error: error.message,
                        });
                    }
                } finally {
                    this.processingMessages.delete(event.id);
                }
            }

            // 清理已確認訊息
            this.eventQueue.set(sub.topic, queue.filter(e => !e.ack));
        }
    }

    // ==================== 內部事件橋接 ====================

    /**
     * 橋接內部事件到 Pub/Sub
     */
    @OnEvent('**')
    async bridgeInternalEvent(payload: any): Promise<void> {
        // 只橋接特定前綴的事件
        const bridgeablePatterns = ['mission.', 'resource.', 'alert.', 'volunteer.', 'ai.'];
        const eventName = payload?.event as string;
        
        if (!eventName) return;
        
        const shouldBridge = bridgeablePatterns.some(p => eventName.startsWith(p));
        if (!shouldBridge) return;

        // 對應到 EventTopic
        const topicKey = eventName.toUpperCase().replace(/\./g, '_');
        const topic = EventTopic[topicKey as keyof typeof EventTopic];
        
        if (topic) {
            await this.publish(topic, payload);
        }
    }

    // ==================== 統計與監控 ====================

    /**
     * 取得發布統計
     */
    getPublishStats(): typeof this.publishStats & { 
        successRate: number;
        topTopics: Array<{ topic: EventTopic; count: number }>;
    } {
        const topTopics = Array.from(this.publishStats.byTopic.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([topic, count]) => ({ topic, count }));

        return {
            ...this.publishStats,
            byTopic: this.publishStats.byTopic,
            successRate: this.publishStats.total > 0 
                ? (this.publishStats.successful / this.publishStats.total) * 100 
                : 100,
            topTopics,
        };
    }

    /**
     * 取得佇列深度
     */
    getQueueDepths(): Array<{ topic: EventTopic; pending: number; processed: number }> {
        return Array.from(this.eventQueue.entries()).map(([topic, events]) => ({
            topic,
            pending: events.filter(e => !e.ack).length,
            processed: events.filter(e => e.ack).length,
        }));
    }

    /**
     * 取得訂閱列表
     */
    getSubscriptions(): Array<{ name: string; topic: EventTopic }> {
        return this.subscriptions.map(s => ({
            name: s.name,
            topic: s.topic,
        }));
    }

    /**
     * 清除舊事件 (保留 24 小時)
     */
    purgeOldEvents(retentionHours: number = 24): number {
        let purgedCount = 0;
        const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

        for (const [topic, events] of this.eventQueue.entries()) {
            const before = events.length;
            const filtered = events.filter(e => e.timestamp > cutoff);
            this.eventQueue.set(topic, filtered);
            purgedCount += before - filtered.length;
        }

        if (purgedCount > 0) {
            this.logger.log(`Purged ${purgedCount} old events`);
        }

        return purgedCount;
    }
}
