/**
 * React Hooks for RxDB Usage
 * Provides easy access to RxDB collections with CRDT sync
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RxDocument } from 'rxdb';
import { getDatabase, lamportClock, LightKeepersDB } from '../services/rxdbDatabase';
import { rxdbSyncManager, SyncState } from '../services/rxdbSyncService';

// ============ Hook: Use RxDB Database ============

/**
 * Hook to get the RxDB database instance
 */
export function useRxDatabase() {
    const [db, setDb] = useState<LightKeepersDB | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        getDatabase()
            .then((database) => {
                if (isMounted) {
                    setDb(database);
                    setIsReady(true);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return { db, isReady, error };
}

// ============ Hook: Use Sync State ============

/**
 * Hook to monitor RxDB sync status
 */
export function useSyncState() {
    const [syncState, setSyncState] = useState<SyncState>(() =>
        rxdbSyncManager.getSyncState()
    );

    useEffect(() => {
        const subscription = rxdbSyncManager.getSyncState$().subscribe(setSyncState);
        return () => subscription.unsubscribe();
    }, []);

    const forceSync = useCallback(async () => {
        await rxdbSyncManager.forceSync();
    }, []);

    return {
        ...syncState,
        forceSync
    };
}

// ============ Hook: Use Tasks Collection ============

interface TaskDoc {
    id: string;
    missionSessionId: string;
    title: string;
    description?: string;
    status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    assignedTo?: string[];
    location?: { lat: number; lng: number };
    _lamportClock: number;
    updatedAt: string;
    createdAt: string;
}

/**
 * Hook to read and write tasks with CRDT sync
 */
export function useTasks(missionSessionId: string) {
    const { db, isReady } = useRxDatabase();
    const [tasks, setTasks] = useState<TaskDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Subscribe to tasks collection
    useEffect(() => {
        if (!db || !isReady) return;

        const subscription = db.tasks
            .find({
                selector: { missionSessionId }
            })
            .$.subscribe((docs) => {
                setTasks(docs.map(d => d.toJSON() as TaskDoc));
                setIsLoading(false);
            });

        return () => subscription.unsubscribe();
    }, [db, isReady, missionSessionId]);

    // Create task with CRDT metadata
    const createTask = useCallback(async (task: Omit<TaskDoc, 'id' | '_lamportClock' | 'createdAt' | 'updatedAt'>) => {
        if (!db) throw new Error('Database not ready');

        const now = new Date().toISOString();
        const newTask: TaskDoc = {
            ...task,
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            _lamportClock: lamportClock.tick(),
            createdAt: now,
            updatedAt: now
        };

        await db.tasks.insert(newTask);
        return newTask;
    }, [db]);

    // Update task with CRDT timestamp
    const updateTask = useCallback(async (id: string, updates: Partial<TaskDoc>) => {
        if (!db) throw new Error('Database not ready');

        const doc = await db.tasks.findOne(id).exec();
        if (!doc) throw new Error('Task not found');

        await doc.patch({
            ...updates,
            _lamportClock: lamportClock.tick(),
            updatedAt: new Date().toISOString()
        });
    }, [db]);

    // Delete task (soft delete)
    const deleteTask = useCallback(async (id: string) => {
        if (!db) throw new Error('Database not ready');

        const doc = await db.tasks.findOne(id).exec();
        if (doc) {
            await doc.remove();
        }
    }, [db]);

    return {
        tasks,
        isLoading,
        createTask,
        updateTask,
        deleteTask
    };
}

// ============ Hook: Use Field Reports ============

interface FieldReportDoc {
    id: string;
    missionSessionId: string;
    reportType: string;
    severity?: string;
    title: string;
    description?: string;
    location?: { lat: number; lng: number };
    mediaUrls?: string[];
    reporterId?: string;
    _lamportClock: number;
    _syncStatus: 'pending' | 'synced' | 'conflict';
    createdAt: string;
}

/**
 * Hook to manage field reports with offline-first pattern
 */
export function useFieldReports(missionSessionId: string) {
    const { db, isReady } = useRxDatabase();
    const [reports, setReports] = useState<FieldReportDoc[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Subscribe to reports collection
    useEffect(() => {
        if (!db || !isReady) return;

        const subscription = db.field_reports
            .find({
                selector: { missionSessionId },
                sort: [{ createdAt: 'desc' }]
            })
            .$.subscribe((docs) => {
                const jsonDocs = docs.map(d => d.toJSON() as FieldReportDoc);
                setReports(jsonDocs);
                setPendingCount(jsonDocs.filter(r => r._syncStatus === 'pending').length);
                setIsLoading(false);
            });

        return () => subscription.unsubscribe();
    }, [db, isReady, missionSessionId]);

    // Create report (offline-first)
    const createReport = useCallback(async (
        report: Omit<FieldReportDoc, 'id' | '_lamportClock' | '_syncStatus' | 'createdAt'>
    ) => {
        if (!db) throw new Error('Database not ready');

        const now = new Date().toISOString();
        const newReport: FieldReportDoc = {
            ...report,
            id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            _lamportClock: lamportClock.tick(),
            _syncStatus: 'pending',
            createdAt: now
        };

        await db.field_reports.insert(newReport);
        return newReport;
    }, [db]);

    return {
        reports,
        pendingCount,
        isLoading,
        createReport
    };
}

// ============ Hook: Use Resources ============

interface ResourceDoc {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    location?: string;
    _quantityDelta: number;
    _lamportClock: number;
    updatedAt: string;
}

/**
 * Hook to manage resources with Counter CRDT for quantities
 */
export function useResources(category?: string) {
    const { db, isReady } = useRxDatabase();
    const [resources, setResources] = useState<ResourceDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Subscribe to resources
    useEffect(() => {
        if (!db || !isReady) return;

        const selector = category ? { category } : {};

        const subscription = db.resources
            .find({ selector })
            .$.subscribe((docs) => {
                setResources(docs.map(d => d.toJSON() as ResourceDoc));
                setIsLoading(false);
            });

        return () => subscription.unsubscribe();
    }, [db, isReady, category]);

    // Adjust quantity using Counter CRDT delta
    const adjustQuantity = useCallback(async (id: string, delta: number) => {
        if (!db) throw new Error('Database not ready');

        const doc = await db.resources.findOne(id).exec();
        if (!doc) throw new Error('Resource not found');

        const current = doc.toJSON() as ResourceDoc;

        await doc.patch({
            quantity: current.quantity + delta,
            _quantityDelta: (current._quantityDelta || 0) + delta,
            _lamportClock: lamportClock.tick(),
            updatedAt: new Date().toISOString()
        });
    }, [db]);

    return {
        resources,
        isLoading,
        adjustQuantity
    };
}

// ============ Hook: Use SOS Signals ============

interface SosSignalDoc {
    id: string;
    missionSessionId: string;
    volunteerId: string;
    location?: { lat: number; lng: number };
    status: 'active' | 'acknowledged' | 'resolved';
    message?: string;
    _lamportClock: number;
    createdAt: string;
}

/**
 * Hook for SOS signals - fast sync, priority delivery
 */
export function useSosSignals(missionSessionId: string) {
    const { db, isReady } = useRxDatabase();
    const [signals, setSignals] = useState<SosSignalDoc[]>([]);
    const [activeCount, setActiveCount] = useState(0);

    // Subscribe to SOS signals
    useEffect(() => {
        if (!db || !isReady) return;

        const subscription = db.sos_signals
            .find({
                selector: { missionSessionId },
                sort: [{ createdAt: 'desc' }]
            })
            .$.subscribe((docs) => {
                const jsonDocs = docs.map(d => d.toJSON() as SosSignalDoc);
                setSignals(jsonDocs);
                setActiveCount(jsonDocs.filter(s => s.status === 'active').length);
            });

        return () => subscription.unsubscribe();
    }, [db, isReady, missionSessionId]);

    // Send SOS
    const sendSos = useCallback(async (
        volunteerId: string,
        location: { lat: number; lng: number },
        message?: string
    ) => {
        if (!db) throw new Error('Database not ready');

        const now = new Date().toISOString();
        const sos: SosSignalDoc = {
            id: `sos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            missionSessionId,
            volunteerId,
            location,
            status: 'active',
            message,
            _lamportClock: lamportClock.tick(),
            createdAt: now
        };

        await db.sos_signals.insert(sos);
        return sos;
    }, [db, missionSessionId]);

    // Acknowledge SOS
    const acknowledgeSos = useCallback(async (id: string) => {
        if (!db) throw new Error('Database not ready');

        const doc = await db.sos_signals.findOne(id).exec();
        if (doc) {
            await doc.patch({
                status: 'acknowledged',
                _lamportClock: lamportClock.tick()
            });
        }
    }, [db]);

    // Resolve SOS
    const resolveSos = useCallback(async (id: string) => {
        if (!db) throw new Error('Database not ready');

        const doc = await db.sos_signals.findOne(id).exec();
        if (doc) {
            await doc.patch({
                status: 'resolved',
                _lamportClock: lamportClock.tick()
            });
        }
    }, [db]);

    return {
        signals,
        activeCount,
        sendSos,
        acknowledgeSos,
        resolveSos
    };
}

export default {
    useRxDatabase,
    useSyncState,
    useTasks,
    useFieldReports,
    useResources,
    useSosSignals
};
