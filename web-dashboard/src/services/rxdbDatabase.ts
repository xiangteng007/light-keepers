/**
 * RxDB Database Configuration for Light Keepers v3.0
 * Implements CRDT-like conflict resolution for offline-first sync
 * 
 * Strategy: Lamport Timestamp + Last-Write-Wins with merge for specific fields
 */

import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection, RxDocument } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';

// Add plugins
if (import.meta.env.DEV) {
    addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBLeaderElectionPlugin);

// ============ Schema Definitions ============

/**
 * Task Schema - For offline task management with CRDT sync
 */
const taskSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        missionSessionId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: {
            type: 'string',
            enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
        },
        priority: {
            type: 'string',
            enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        },
        assignedTo: { type: 'array', items: { type: 'string' } },
        location: {
            type: 'object',
            properties: {
                lat: { type: 'number' },
                lng: { type: 'number' }
            }
        },
        // CRDT Metadata
        _lamportClock: { type: 'number' },
        _lastModifiedBy: { type: 'string' },
        _serverVersion: { type: 'number' },
        _localVersion: { type: 'number' },
        _conflictResolution: { type: 'string' }, // 'pending' | 'resolved' | 'manual'
        updatedAt: { type: 'string' },
        createdAt: { type: 'string' },
        _deleted: { type: 'boolean' }
    },
    required: ['id', 'missionSessionId', 'title', 'status', '_lamportClock'],
    indexes: ['missionSessionId', 'status', 'updatedAt']
} as const;

/**
 * Field Report Schema - For offline report submission
 */
const fieldReportSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        missionSessionId: { type: 'string' },
        reportType: { type: 'string' },
        severity: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        location: {
            type: 'object',
            properties: {
                lat: { type: 'number' },
                lng: { type: 'number' }
            }
        },
        mediaUrls: { type: 'array', items: { type: 'string' } },
        reporterId: { type: 'string' },
        // CRDT Metadata
        _lamportClock: { type: 'number' },
        _syncStatus: { type: 'string' }, // 'pending' | 'synced' | 'conflict'
        _serverVersion: { type: 'number' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        _deleted: { type: 'boolean' }
    },
    required: ['id', 'missionSessionId', 'reportType', '_lamportClock'],
    indexes: ['missionSessionId', '_syncStatus', 'createdAt']
} as const;

/**
 * Resource/Inventory Schema - For supply tracking with merge conflicts
 */
const resourceSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        category: { type: 'string' },
        quantity: { type: 'number' },
        unit: { type: 'string' },
        location: { type: 'string' },
        // CRDT Metadata - Counter CRDT for quantity
        _quantityDelta: { type: 'number' }, // Accumulated changes for merge
        _lamportClock: { type: 'number' },
        _lastModifiedBy: { type: 'string' },
        _serverVersion: { type: 'number' },
        updatedAt: { type: 'string' },
        _deleted: { type: 'boolean' }
    },
    required: ['id', 'name', 'quantity', '_lamportClock'],
    indexes: ['category', 'location']
} as const;

/**
 * SOS Signal Schema - Priority queue for emergency signals
 */
const sosSignalSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        missionSessionId: { type: 'string' },
        volunteerId: { type: 'string' },
        location: {
            type: 'object',
            properties: {
                lat: { type: 'number' },
                lng: { type: 'number' }
            }
        },
        status: { type: 'string' }, // 'active' | 'acknowledged' | 'resolved'
        message: { type: 'string' },
        _lamportClock: { type: 'number' },
        _syncStatus: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        _deleted: { type: 'boolean' }
    },
    required: ['id', 'volunteerId', '_lamportClock'],
    indexes: ['missionSessionId', 'status', 'createdAt']
} as const;

// ============ Type Definitions ============

export type TaskDocument = RxDocument<typeof taskSchema>;
export type FieldReportDocument = RxDocument<typeof fieldReportSchema>;
export type ResourceDocument = RxDocument<typeof resourceSchema>;
export type SosSignalDocument = RxDocument<typeof sosSignalSchema>;

export interface LightKeepersDBCollections {
    tasks: RxCollection<typeof taskSchema>;
    field_reports: RxCollection<typeof fieldReportSchema>;
    resources: RxCollection<typeof resourceSchema>;
    sos_signals: RxCollection<typeof sosSignalSchema>;
}

export type LightKeepersDB = RxDatabase<LightKeepersDBCollections>;

// ============ Lamport Clock Manager ============

class LamportClockManager {
    private clock: number = 0;
    private readonly storageKey = 'lightkeepers-lamport-clock';

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            this.clock = parseInt(stored, 10);
        }
    }

    private saveToStorage(): void {
        localStorage.setItem(this.storageKey, this.clock.toString());
    }

    /**
     * Get next timestamp (increment and return)
     */
    tick(): number {
        this.clock++;
        this.saveToStorage();
        return this.clock;
    }

    /**
     * Update clock when receiving remote timestamp
     * Ensures local clock is always >= remote
     */
    update(remoteTimestamp: number): number {
        this.clock = Math.max(this.clock, remoteTimestamp) + 1;
        this.saveToStorage();
        return this.clock;
    }

    current(): number {
        return this.clock;
    }
}

export const lamportClock = new LamportClockManager();

// ============ CRDT Conflict Resolution ============

/**
 * Last-Write-Wins conflict resolver using Lamport timestamps
 * For fields where we want to keep the most recent change
 */
export function resolveLWW<T extends { _lamportClock: number; _lastModifiedBy?: string }>(
    local: T,
    remote: T
): T {
    if (remote._lamportClock > local._lamportClock) {
        return remote;
    } else if (local._lamportClock > remote._lamportClock) {
        return local;
    } else {
        // Tie-breaker: use device/user ID alphabetically
        const localId = local._lastModifiedBy || '';
        const remoteId = remote._lastModifiedBy || '';
        return localId > remoteId ? local : remote;
    }
}

/**
 * Counter CRDT resolver for quantity fields (resources)
 * Merges quantity changes additively
 */
export function resolveCounterCRDT<T extends { quantity: number; _quantityDelta: number }>(
    local: T,
    remote: T,
    serverBase: T
): T {
    // Calculate actual deltas from server baseline
    const localDelta = local._quantityDelta || 0;
    const remoteDelta = remote._quantityDelta || 0;

    // Merge: server base + local delta + remote delta
    const mergedQuantity = serverBase.quantity + localDelta + remoteDelta;

    return {
        ...remote,
        quantity: mergedQuantity,
        _quantityDelta: 0, // Reset delta after merge
    };
}

/**
 * Set-Union CRDT for array fields (e.g., assignedTo)
 * Merges arrays with union semantics - no elements lost
 */
export function resolveSetUnion<T>(local: T[], remote: T[]): T[] {
    const set = new Set([...local, ...remote]);
    return Array.from(set);
}

// ============ Database Instance ============

let dbInstance: LightKeepersDB | null = null;

/**
 * Initialize or get the RxDB database instance
 */
export async function getDatabase(): Promise<LightKeepersDB> {
    if (dbInstance) {
        return dbInstance;
    }

    dbInstance = await createRxDatabase<LightKeepersDBCollections>({
        name: 'lightkeepers-v3',
        storage: getRxStorageDexie(),
        multiInstance: true, // Allow multiple browser tabs
        eventReduce: true,   // Optimize event processing
        ignoreDuplicate: true
    });

    // Add collections
    await dbInstance.addCollections({
        tasks: {
            schema: taskSchema,
            conflictHandler: async (input) => {
                // Custom conflict handler for tasks
                const resolved = resolveLWW(
                    input.newDocumentState as any,
                    input.realMasterState as any
                );

                // Merge array fields with union
                if (input.newDocumentState.assignedTo && input.realMasterState.assignedTo) {
                    resolved.assignedTo = resolveSetUnion(
                        input.newDocumentState.assignedTo as string[],
                        input.realMasterState.assignedTo as string[]
                    );
                }

                return {
                    isEqual: false,
                    documentData: resolved
                };
            }
        },
        field_reports: {
            schema: fieldReportSchema
        },
        resources: {
            schema: resourceSchema,
            conflictHandler: async (input) => {
                // Use Counter CRDT for quantity fields
                const resolved = resolveCounterCRDT(
                    input.newDocumentState as any,
                    input.realMasterState as any,
                    input.realMasterState as any // Use remote as base
                );
                return {
                    isEqual: false,
                    documentData: resolved
                };
            }
        },
        sos_signals: {
            schema: sosSignalSchema
        }
    });

    console.log('[RxDB] Database initialized with CRDT conflict handlers');
    return dbInstance;
}

/**
 * Get the database, creating if needed
 */
export async function initDatabase(): Promise<LightKeepersDB> {
    return getDatabase();
}

/**
 * Clean up database (for testing/reset)
 */
export async function destroyDatabase(): Promise<void> {
    if (dbInstance) {
        await dbInstance.destroy();
        dbInstance = null;
    }
}

export default {
    getDatabase,
    initDatabase,
    destroyDatabase,
    lamportClock,
    resolveLWW,
    resolveCounterCRDT,
    resolveSetUnion
};
