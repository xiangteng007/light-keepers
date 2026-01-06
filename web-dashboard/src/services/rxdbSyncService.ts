/**
 * RxDB Sync Replication Service for Light Keepers v3.0
 * Handles bidirectional sync between local RxDB and backend API
 * with CRDT conflict resolution
 */

import { RxReplicationState, replicateRxCollection } from 'rxdb/plugins/replication';
import { Subject, BehaviorSubject } from 'rxjs';
import { getDatabase, lamportClock, LightKeepersDB } from './rxdbDatabase';

// ============ Types ============

export interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncAt: Date | null;
    pendingPush: number;
    pendingPull: number;
    conflicts: ConflictInfo[];
    errors: string[];
}

export interface ConflictInfo {
    documentId: string;
    collection: string;
    localVersion: number;
    remoteVersion: number;
    resolvedWith: 'local' | 'remote' | 'merge';
    resolvedAt: Date;
}

export interface PullCheckpoint {
    id: string;
    updatedAt: string;
}

// ============ Configuration ============

const API_URL = import.meta.env.VITE_API_URL || '';
const SYNC_BATCH_SIZE = 50;
const SYNC_RETRY_TIMES = 3;
const LIVE_SYNC_INTERVAL_MS = 5000; // 5 seconds for live sync

// ============ Sync Manager ============

class RxDBSyncManager {
    private db: LightKeepersDB | null = null;
    private replications: Map<string, RxReplicationState<any, any>> = new Map();
    private syncState$ = new BehaviorSubject<SyncState>({
        isOnline: navigator.onLine,
        isSyncing: false,
        lastSyncAt: null,
        pendingPush: 0,
        pendingPull: 0,
        conflicts: [],
        errors: []
    });

    private authToken: string | null = null;
    private missionSessionId: string | null = null;

    constructor() {
        this.initNetworkListeners();
    }

    private initNetworkListeners(): void {
        window.addEventListener('online', () => {
            this.updateSyncState({ isOnline: true });
            this.startAllReplications();
        });

        window.addEventListener('offline', () => {
            this.updateSyncState({ isOnline: false });
            this.pauseAllReplications();
        });
    }

    private updateSyncState(partial: Partial<SyncState>): void {
        this.syncState$.next({
            ...this.syncState$.value,
            ...partial
        });
    }

    /**
     * Get sync state observable
     */
    getSyncState$() {
        return this.syncState$.asObservable();
    }

    /**
     * Get current sync state
     */
    getSyncState(): SyncState {
        return this.syncState$.value;
    }

    /**
     * Initialize sync manager with auth token
     */
    async initialize(authToken: string, missionSessionId?: string): Promise<void> {
        this.authToken = authToken;
        this.missionSessionId = missionSessionId || null;
        this.db = await getDatabase();

        if (navigator.onLine) {
            await this.startAllReplications();
        }

        console.log('[RxDBSync] Manager initialized');
    }

    /**
     * Set current mission session for sync context
     */
    setMissionSession(missionSessionId: string): void {
        this.missionSessionId = missionSessionId;
        // Restart replications with new context
        if (this.db && navigator.onLine) {
            this.startAllReplications();
        }
    }

    /**
     * Start all collection replications
     */
    private async startAllReplications(): Promise<void> {
        if (!this.db || !this.authToken) return;

        this.updateSyncState({ isSyncing: true });

        try {
            // Tasks replication
            await this.setupTasksReplication();

            // Field reports replication
            await this.setupFieldReportsReplication();

            // Resources replication
            await this.setupResourcesReplication();

            // SOS signals replication
            await this.setupSosSignalsReplication();

            this.updateSyncState({
                isSyncing: false,
                lastSyncAt: new Date()
            });
        } catch (error) {
            console.error('[RxDBSync] Failed to start replications:', error);
            this.updateSyncState({
                isSyncing: false,
                errors: [...this.syncState$.value.errors, (error as Error).message]
            });
        }
    }

    /**
     * Pause all replications (for offline mode)
     */
    private pauseAllReplications(): void {
        this.replications.forEach((repl) => {
            repl.cancel();
        });
        this.replications.clear();
    }

    /**
     * Setup tasks collection replication
     */
    private async setupTasksReplication(): Promise<void> {
        if (!this.db || !this.missionSessionId) return;

        const existingRepl = this.replications.get('tasks');
        if (existingRepl) {
            await existingRepl.cancel();
        }

        const replicationState = replicateRxCollection({
            collection: this.db.tasks,
            replicationIdentifier: `tasks-${this.missionSessionId}`,
            live: true,
            liveInterval: LIVE_SYNC_INTERVAL_MS,
            retryTime: SYNC_RETRY_TIMES * 1000,

            push: {
                handler: async (docs) => {
                    const response = await fetch(`${API_URL}/api/tasks/sync/push`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.authToken}`
                        },
                        body: JSON.stringify({
                            missionSessionId: this.missionSessionId,
                            documents: docs.map(d => ({
                                ...d.newDocumentState,
                                _lamportClock: lamportClock.tick()
                            }))
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Push failed: ${response.statusText}`);
                    }

                    const result = await response.json();
                    return result.conflicts || [];
                },
                batchSize: SYNC_BATCH_SIZE
            },

            pull: {
                handler: async (checkpoint: PullCheckpoint | null, batchSize: number) => {
                    const params = new URLSearchParams({
                        missionSessionId: this.missionSessionId!,
                        limit: batchSize.toString()
                    });

                    if (checkpoint) {
                        params.set('since', checkpoint.updatedAt);
                    }

                    const response = await fetch(
                        `${API_URL}/api/tasks/sync/pull?${params}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${this.authToken}`
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`Pull failed: ${response.statusText}`);
                    }

                    const result = await response.json();

                    // Update lamport clock from server
                    if (result.serverClock) {
                        lamportClock.update(result.serverClock);
                    }

                    return {
                        documents: result.documents.map((doc: any) => ({
                            ...doc,
                            _lamportClock: lamportClock.update(doc._lamportClock || 0)
                        })),
                        checkpoint: result.checkpoint
                    };
                },
                batchSize: SYNC_BATCH_SIZE
            }
        });

        // Track conflicts
        replicationState.error$.subscribe((error) => {
            console.error('[RxDBSync] Tasks replication error:', error);
            this.updateSyncState({
                errors: [...this.syncState$.value.errors, error.message]
            });
        });

        this.replications.set('tasks', replicationState);
    }

    /**
     * Setup field reports collection replication
     */
    private async setupFieldReportsReplication(): Promise<void> {
        if (!this.db || !this.missionSessionId) return;

        const existingRepl = this.replications.get('field_reports');
        if (existingRepl) {
            await existingRepl.cancel();
        }

        const replicationState = replicateRxCollection({
            collection: this.db.field_reports,
            replicationIdentifier: `field_reports-${this.missionSessionId}`,
            live: true,
            liveInterval: LIVE_SYNC_INTERVAL_MS,
            retryTime: SYNC_RETRY_TIMES * 1000,

            push: {
                handler: async (docs) => {
                    const response = await fetch(
                        `${API_URL}/api/mission-sessions/${this.missionSessionId}/reports/sync/push`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.authToken}`
                            },
                            body: JSON.stringify({
                                documents: docs.map(d => ({
                                    ...d.newDocumentState,
                                    _lamportClock: lamportClock.tick()
                                }))
                            })
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`Push failed: ${response.statusText}`);
                    }

                    return [];
                },
                batchSize: SYNC_BATCH_SIZE
            },

            pull: {
                handler: async (checkpoint: PullCheckpoint | null, batchSize: number) => {
                    const params = new URLSearchParams({
                        limit: batchSize.toString()
                    });

                    if (checkpoint) {
                        params.set('since', checkpoint.updatedAt);
                    }

                    const response = await fetch(
                        `${API_URL}/api/mission-sessions/${this.missionSessionId}/reports/sync/pull?${params}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${this.authToken}`
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`Pull failed: ${response.statusText}`);
                    }

                    const result = await response.json();

                    return {
                        documents: result.documents || [],
                        checkpoint: result.checkpoint
                    };
                },
                batchSize: SYNC_BATCH_SIZE
            }
        });

        this.replications.set('field_reports', replicationState);
    }

    /**
     * Setup resources collection replication
     */
    private async setupResourcesReplication(): Promise<void> {
        if (!this.db) return;

        const existingRepl = this.replications.get('resources');
        if (existingRepl) {
            await existingRepl.cancel();
        }

        const replicationState = replicateRxCollection({
            collection: this.db.resources,
            replicationIdentifier: 'resources-global',
            live: true,
            liveInterval: LIVE_SYNC_INTERVAL_MS * 2, // Slower sync for resources
            retryTime: SYNC_RETRY_TIMES * 1000,

            push: {
                handler: async (docs) => {
                    const response = await fetch(`${API_URL}/api/resources/sync/push`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.authToken}`
                        },
                        body: JSON.stringify({
                            documents: docs.map(d => ({
                                ...d.newDocumentState,
                                _lamportClock: lamportClock.tick()
                            }))
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Push failed: ${response.statusText}`);
                    }

                    return [];
                },
                batchSize: SYNC_BATCH_SIZE
            },

            pull: {
                handler: async (checkpoint: PullCheckpoint | null, batchSize: number) => {
                    const params = new URLSearchParams({
                        limit: batchSize.toString()
                    });

                    if (checkpoint) {
                        params.set('since', checkpoint.updatedAt);
                    }

                    const response = await fetch(`${API_URL}/api/resources/sync/pull?${params}`, {
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Pull failed: ${response.statusText}`);
                    }

                    const result = await response.json();

                    return {
                        documents: result.documents || [],
                        checkpoint: result.checkpoint
                    };
                },
                batchSize: SYNC_BATCH_SIZE
            }
        });

        this.replications.set('resources', replicationState);
    }

    /**
     * Setup SOS signals collection replication
     */
    private async setupSosSignalsReplication(): Promise<void> {
        if (!this.db || !this.missionSessionId) return;

        const existingRepl = this.replications.get('sos_signals');
        if (existingRepl) {
            await existingRepl.cancel();
        }

        const replicationState = replicateRxCollection({
            collection: this.db.sos_signals,
            replicationIdentifier: `sos_signals-${this.missionSessionId}`,
            live: true,
            liveInterval: 2000, // Fast sync for SOS - 2 seconds
            retryTime: 1000, // Fast retry for SOS

            push: {
                handler: async (docs) => {
                    const response = await fetch(
                        `${API_URL}/api/mission-sessions/${this.missionSessionId}/sos/sync/push`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.authToken}`
                            },
                            body: JSON.stringify({
                                documents: docs.map(d => ({
                                    ...d.newDocumentState,
                                    _lamportClock: lamportClock.tick()
                                }))
                            })
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`SOS Push failed: ${response.statusText}`);
                    }

                    return [];
                },
                batchSize: 10 // Smaller batch for SOS urgency
            },

            pull: {
                handler: async (checkpoint: PullCheckpoint | null, batchSize: number) => {
                    const params = new URLSearchParams({
                        limit: batchSize.toString()
                    });

                    if (checkpoint) {
                        params.set('since', checkpoint.updatedAt);
                    }

                    const response = await fetch(
                        `${API_URL}/api/mission-sessions/${this.missionSessionId}/sos/sync/pull?${params}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${this.authToken}`
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`SOS Pull failed: ${response.statusText}`);
                    }

                    const result = await response.json();

                    return {
                        documents: result.documents || [],
                        checkpoint: result.checkpoint
                    };
                },
                batchSize: 10
            }
        });

        this.replications.set('sos_signals', replicationState);
    }

    /**
     * Force immediate sync of all collections
     */
    async forceSync(): Promise<void> {
        const promises: Promise<void>[] = [];

        this.replications.forEach((repl) => {
            promises.push(repl.reSync());
        });

        await Promise.all(promises);
        this.updateSyncState({ lastSyncAt: new Date() });
    }

    /**
     * Get pending changes count
     */
    async getPendingCount(): Promise<{ push: number; pull: number }> {
        let push = 0;
        let pull = 0;

        // This would need actual implementation based on RxDB internals
        // For now, return placeholder
        return { push, pull };
    }

    /**
     * Cleanup and destroy
     */
    async destroy(): Promise<void> {
        this.pauseAllReplications();
        this.syncState$.complete();
    }
}

// ============ Singleton Export ============

export const rxdbSyncManager = new RxDBSyncManager();
export default rxdbSyncManager;
