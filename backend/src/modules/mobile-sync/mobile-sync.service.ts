import { Injectable, Logger } from '@nestjs/common';

export interface SyncState {
    deviceId: string;
    userId: string;
    lastSyncAt: Date;
    pendingUploads: number;
    pendingDownloads: number;
    version: string;
}

export interface OfflineCheckIn {
    id: string;
    volunteerId: string;
    timestamp: Date;
    location: { lat: number; lng: number; accuracy?: number };
    type: 'check_in' | 'check_out';
    syncStatus: 'pending' | 'synced' | 'failed';
    deviceId: string;
    queuedAt: Date;
}

export interface PushSubscription {
    id: string;
    userId: string;
    deviceId: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    enabled: boolean;
    topics: string[];
    createdAt: Date;
    lastActiveAt: Date;
}

export interface SyncResult {
    success: boolean;
    uploaded: number;
    downloaded: number;
    conflicts: { itemId: string; type: string; resolution: string }[];
    timestamp: Date;
}

@Injectable()
export class MobileSyncService {
    private readonly logger = new Logger(MobileSyncService.name);
    private syncStates: Map<string, SyncState> = new Map();
    private offlineQueue: Map<string, OfflineCheckIn[]> = new Map();
    private subscriptions: Map<string, PushSubscription> = new Map();

    // ===== 同步狀態管理 =====

    getSyncState(deviceId: string): SyncState | undefined {
        return this.syncStates.get(deviceId);
    }

    registerDevice(deviceId: string, userId: string, version: string): SyncState {
        const state: SyncState = {
            deviceId,
            userId,
            lastSyncAt: new Date(),
            pendingUploads: 0,
            pendingDownloads: 0,
            version,
        };
        this.syncStates.set(deviceId, state);
        return state;
    }

    updateSyncState(deviceId: string, updates: Partial<SyncState>): SyncState | null {
        const state = this.syncStates.get(deviceId);
        if (!state) return null;
        Object.assign(state, updates);
        return state;
    }

    // ===== 離線打卡隊列 =====

    queueOfflineCheckIn(data: Omit<OfflineCheckIn, 'id' | 'syncStatus' | 'queuedAt'>): OfflineCheckIn {
        const checkIn: OfflineCheckIn = {
            ...data,
            id: `oc-${Date.now()}`,
            syncStatus: 'pending',
            queuedAt: new Date(),
        };

        const queue = this.offlineQueue.get(data.deviceId) || [];
        queue.push(checkIn);
        this.offlineQueue.set(data.deviceId, queue);

        this.logger.log(`Queued offline check-in for device: ${data.deviceId}`);
        return checkIn;
    }

    getOfflineQueue(deviceId: string): OfflineCheckIn[] {
        return this.offlineQueue.get(deviceId) || [];
    }

    async syncOfflineQueue(deviceId: string): Promise<SyncResult> {
        const queue = this.offlineQueue.get(deviceId) || [];
        const pending = queue.filter(c => c.syncStatus === 'pending');

        let uploaded = 0;
        const conflicts: { itemId: string; type: string; resolution: string }[] = [];

        for (const checkIn of pending) {
            try {
                // 模擬同步到服務器
                checkIn.syncStatus = 'synced';
                uploaded++;
            } catch (error) {
                checkIn.syncStatus = 'failed';
                conflicts.push({
                    itemId: checkIn.id,
                    type: 'check_in',
                    resolution: 'retry',
                });
            }
        }

        // 更新同步狀態
        const state = this.syncStates.get(deviceId);
        if (state) {
            state.lastSyncAt = new Date();
            state.pendingUploads = queue.filter(c => c.syncStatus === 'pending').length;
        }

        return {
            success: conflicts.length === 0,
            uploaded,
            downloaded: 0,
            conflicts,
            timestamp: new Date(),
        };
    }

    clearSyncedItems(deviceId: string): number {
        const queue = this.offlineQueue.get(deviceId) || [];
        const before = queue.length;
        const remaining = queue.filter(c => c.syncStatus !== 'synced');
        this.offlineQueue.set(deviceId, remaining);
        return before - remaining.length;
    }

    // ===== 推播通知管理 =====

    registerPushSubscription(data: {
        userId: string;
        deviceId: string;
        token: string;
        platform: 'ios' | 'android' | 'web';
        topics?: string[];
    }): PushSubscription {
        const subscription: PushSubscription = {
            id: `ps-${Date.now()}`,
            userId: data.userId,
            deviceId: data.deviceId,
            token: data.token,
            platform: data.platform,
            enabled: true,
            topics: data.topics || ['general', 'alerts', 'missions'],
            createdAt: new Date(),
            lastActiveAt: new Date(),
        };
        this.subscriptions.set(data.deviceId, subscription);
        return subscription;
    }

    getSubscription(deviceId: string): PushSubscription | undefined {
        return this.subscriptions.get(deviceId);
    }

    getUserSubscriptions(userId: string): PushSubscription[] {
        return Array.from(this.subscriptions.values())
            .filter(s => s.userId === userId);
    }

    updateSubscription(deviceId: string, updates: Partial<PushSubscription>): PushSubscription | null {
        const sub = this.subscriptions.get(deviceId);
        if (!sub) return null;
        Object.assign(sub, updates, { lastActiveAt: new Date() });
        return sub;
    }

    toggleTopic(deviceId: string, topic: string, enabled: boolean): boolean {
        const sub = this.subscriptions.get(deviceId);
        if (!sub) return false;

        if (enabled && !sub.topics.includes(topic)) {
            sub.topics.push(topic);
        } else if (!enabled) {
            sub.topics = sub.topics.filter(t => t !== topic);
        }
        return true;
    }

    async sendPushNotification(
        userId: string,
        notification: { title: string; body: string; data?: Record<string, any> }
    ): Promise<number> {
        const subs = this.getUserSubscriptions(userId).filter(s => s.enabled);

        // 模擬發送推播
        this.logger.log(`Sending push to ${subs.length} devices for user: ${userId}`);

        return subs.length;
    }

    async broadcastToTopic(
        topic: string,
        notification: { title: string; body: string; data?: Record<string, any> }
    ): Promise<number> {
        const subs = Array.from(this.subscriptions.values())
            .filter(s => s.enabled && s.topics.includes(topic));

        this.logger.log(`Broadcasting to ${subs.length} devices on topic: ${topic}`);

        return subs.length;
    }

    // ===== GPS 追蹤 =====

    private locationHistory: Map<string, { lat: number; lng: number; timestamp: Date }[]> = new Map();

    reportLocation(userId: string, location: { lat: number; lng: number }): void {
        const history = this.locationHistory.get(userId) || [];
        history.push({ ...location, timestamp: new Date() });

        // 只保留最近100筆
        if (history.length > 100) {
            history.shift();
        }

        this.locationHistory.set(userId, history);
    }

    getLocationHistory(userId: string, limit: number = 20): { lat: number; lng: number; timestamp: Date }[] {
        const history = this.locationHistory.get(userId) || [];
        return history.slice(-limit);
    }

    getActiveUsers(sinceMinutes: number = 10): { userId: string; lastLocation: { lat: number; lng: number }; lastSeen: Date }[] {
        const threshold = new Date(Date.now() - sinceMinutes * 60 * 1000);
        const active: { userId: string; lastLocation: { lat: number; lng: number }; lastSeen: Date }[] = [];

        this.locationHistory.forEach((history, userId) => {
            const last = history[history.length - 1];
            if (last && last.timestamp >= threshold) {
                active.push({
                    userId,
                    lastLocation: { lat: last.lat, lng: last.lng },
                    lastSeen: last.timestamp,
                });
            }
        });

        return active;
    }
}
