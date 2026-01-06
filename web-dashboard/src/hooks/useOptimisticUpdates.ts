import { useState, useCallback, useRef } from 'react';
import type { OverlayFeature } from '../components/map';

interface OptimisticUpdate {
    id: string;
    type: 'create' | 'update' | 'delete';
    overlay: OverlayFeature;
    previousState?: OverlayFeature;
    timestamp: number;
    status: 'pending' | 'confirmed' | 'failed';
    retryCount: number;
}

interface ConflictInfo {
    overlayId: string;
    localVersion: number;
    serverVersion: number;
    localData: OverlayFeature;
    serverData: OverlayFeature;
}

interface UseOptimisticUpdatesOptions {
    overlays: OverlayFeature[];
    setOverlays: React.Dispatch<React.SetStateAction<OverlayFeature[]>>;
    onConflict?: (conflict: ConflictInfo) => Promise<'keep_local' | 'keep_server' | 'merge'>;
    maxRetries?: number;
    retryDelay?: number;
}

export function useOptimisticUpdates(options: UseOptimisticUpdatesOptions) {
    const {
        overlays,
        setOverlays,
        onConflict,
        maxRetries = 3,
        retryDelay = 1000,
    } = options;

    const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([]);
    const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
    const updateQueueRef = useRef<Map<string, OptimisticUpdate>>(new Map());

    // Apply optimistic create
    const optimisticCreate = useCallback((overlay: OverlayFeature): string => {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const optimisticOverlay: OverlayFeature = {
            ...overlay,
            id: tempId,
            properties: {
                ...overlay.properties,
                state: 'draft',
            },
        };

        // Add to local state immediately
        setOverlays(prev => [...prev, optimisticOverlay]);

        // Track pending update
        const update: OptimisticUpdate = {
            id: tempId,
            type: 'create',
            overlay: optimisticOverlay,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0,
        };

        setPendingUpdates(prev => [...prev, update]);
        updateQueueRef.current.set(tempId, update);

        return tempId;
    }, [setOverlays]);

    // Apply optimistic update
    const optimisticUpdate = useCallback((overlay: OverlayFeature): void => {
        const previousState = overlays.find(o => o.id === overlay.id);

        // Update local state immediately
        setOverlays(prev => prev.map(o => o.id === overlay.id ? overlay : o));

        // Track pending update
        const update: OptimisticUpdate = {
            id: overlay.id,
            type: 'update',
            overlay,
            previousState,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0,
        };

        setPendingUpdates(prev => {
            // Replace existing pending update for same overlay
            const filtered = prev.filter(u => u.id !== overlay.id);
            return [...filtered, update];
        });
        updateQueueRef.current.set(overlay.id, update);
    }, [overlays, setOverlays]);

    // Apply optimistic delete
    const optimisticDelete = useCallback((overlayId: string): void => {
        const previousState = overlays.find(o => o.id === overlayId);

        // Remove from local state immediately
        setOverlays(prev => prev.filter(o => o.id !== overlayId));

        // Track pending update
        if (previousState) {
            const update: OptimisticUpdate = {
                id: overlayId,
                type: 'delete',
                overlay: previousState,
                previousState,
                timestamp: Date.now(),
                status: 'pending',
                retryCount: 0,
            };

            setPendingUpdates(prev => [...prev, update]);
            updateQueueRef.current.set(overlayId, update);
        }
    }, [overlays, setOverlays]);

    // Confirm a pending update (server acknowledged)
    const confirmUpdate = useCallback((tempId: string, serverId?: string): void => {
        setPendingUpdates(prev => prev.filter(u => u.id !== tempId));
        updateQueueRef.current.delete(tempId);

        // If server returned a different ID (for creates), update local state
        if (serverId && serverId !== tempId) {
            setOverlays(prev => prev.map(o =>
                o.id === tempId ? { ...o, id: serverId } : o
            ));
        }
    }, [setOverlays]);

    // Rollback a failed update
    const rollbackUpdate = useCallback((tempId: string): void => {
        const update = updateQueueRef.current.get(tempId);
        if (!update) return;

        switch (update.type) {
            case 'create':
                // Remove the optimistically created overlay
                setOverlays(prev => prev.filter(o => o.id !== tempId));
                break;
            case 'update':
                // Restore previous state
                if (update.previousState) {
                    setOverlays(prev => prev.map(o =>
                        o.id === tempId ? update.previousState! : o
                    ));
                }
                break;
            case 'delete':
                // Restore deleted overlay
                if (update.previousState) {
                    setOverlays(prev => [...prev, update.previousState!]);
                }
                break;
        }

        setPendingUpdates(prev => prev.filter(u => u.id !== tempId));
        updateQueueRef.current.delete(tempId);
    }, [setOverlays]);

    // Handle version conflict
    const handleConflict = useCallback(async (
        overlayId: string,
        localData: OverlayFeature,
        serverData: OverlayFeature
    ): Promise<OverlayFeature> => {
        const conflict: ConflictInfo = {
            overlayId,
            localVersion: (localData as any).version || 0,
            serverVersion: (serverData as any).version || 0,
            localData,
            serverData,
        };

        setConflicts(prev => [...prev, conflict]);

        if (onConflict) {
            const resolution = await onConflict(conflict);
            setConflicts(prev => prev.filter(c => c.overlayId !== overlayId));

            switch (resolution) {
                case 'keep_local':
                    return localData;
                case 'keep_server':
                    setOverlays(prev => prev.map(o =>
                        o.id === overlayId ? serverData : o
                    ));
                    return serverData;
                case 'merge':
                    // Simple merge: server properties + local geometry
                    const merged: OverlayFeature = {
                        ...serverData,
                        geometry: localData.geometry,
                        properties: {
                            ...serverData.properties,
                            ...localData.properties,
                        },
                    };
                    setOverlays(prev => prev.map(o =>
                        o.id === overlayId ? merged : o
                    ));
                    return merged;
            }
        }

        // Default: keep server version
        setOverlays(prev => prev.map(o =>
            o.id === overlayId ? serverData : o
        ));
        return serverData;
    }, [onConflict, setOverlays]);

    // Retry failed updates
    const retryFailedUpdates = useCallback(async (
        retryFn: (update: OptimisticUpdate) => Promise<boolean>
    ): Promise<void> => {
        const failedUpdates = pendingUpdates.filter(u =>
            u.status === 'failed' && u.retryCount < maxRetries
        );

        for (const update of failedUpdates) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));

            const success = await retryFn(update);
            if (success) {
                confirmUpdate(update.id);
            } else {
                setPendingUpdates(prev => prev.map(u =>
                    u.id === update.id
                        ? { ...u, retryCount: u.retryCount + 1, status: 'failed' as const }
                        : u
                ));
            }
        }
    }, [pendingUpdates, maxRetries, retryDelay, confirmUpdate]);

    // Mark update as failed
    const markFailed = useCallback((tempId: string): void => {
        setPendingUpdates(prev => prev.map(u =>
            u.id === tempId ? { ...u, status: 'failed' as const } : u
        ));
    }, []);

    // Clear all conflicts
    const clearConflicts = useCallback((): void => {
        setConflicts([]);
    }, []);

    return {
        pendingUpdates,
        conflicts,
        hasPendingUpdates: pendingUpdates.length > 0,
        hasConflicts: conflicts.length > 0,
        optimisticCreate,
        optimisticUpdate,
        optimisticDelete,
        confirmUpdate,
        rollbackUpdate,
        handleConflict,
        retryFailedUpdates,
        markFailed,
        clearConflicts,
    };
}

export default useOptimisticUpdates;
