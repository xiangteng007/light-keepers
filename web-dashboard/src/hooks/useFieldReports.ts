import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { fieldReportsApi, type FieldReport, type SosSignal, type LiveLocation } from '../services/fieldReportsApi';

const WS_URL = import.meta.env.VITE_WS_URL || '';

interface UseFieldReportsOptions {
    missionSessionId: string;
    token: string;
    userId: string;
    displayName: string;
    role: string;
    callsign?: string;
}

interface UseFieldReportsReturn {
    // State
    reports: FieldReport[];
    activeSos: SosSignal[];
    liveLocations: LiveLocation[];
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    // Actions
    createReport: (report: Parameters<typeof fieldReportsApi.createReport>[1]) => Promise<FieldReport>;
    updateReport: (reportId: string, update: Parameters<typeof fieldReportsApi.updateReport>[1], version: number) => Promise<FieldReport>;
    triggerSos: (lat: number, lng: number, accuracyM?: number, message?: string) => Promise<{ sosId: string }>;
    ackSos: (sosId: string, note?: string) => Promise<void>;
    resolveSos: (sosId: string, note?: string) => Promise<void>;
    // Refresh
    refresh: () => Promise<void>;
}

/**
 * Hook for managing field reports with real-time updates
 */
export function useFieldReports({
    missionSessionId,
    token,
    userId,
    displayName,
    role,
    callsign,
}: UseFieldReportsOptions): UseFieldReportsReturn {
    const [reports, setReports] = useState<FieldReport[]>([]);
    const [activeSos, setActiveSos] = useState<SosSignal[]>([]);
    const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const lastCursorRef = useRef<string>('');

    // Initialize socket connection
    useEffect(() => {
        if (!missionSessionId || !token) return;

        const socket = io(`${WS_URL}/field-reports`, {
            auth: { token },
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            setIsConnected(true);
            // Join mission room
            socket.emit('mission:join', {
                missionSessionId,
                userId,
                displayName,
                callsign,
                role,
            });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Report events
        socket.on('report:created', (data: { report: FieldReport }) => {
            setReports(prev => [data.report, ...prev]);
        });

        socket.on('report:updated', (data: { reportId: string; changes: Partial<FieldReport>; version: number }) => {
            setReports(prev => prev.map(r =>
                r.id === data.reportId ? { ...r, ...data.changes, version: data.version } : r
            ));
        });

        // SOS events
        socket.on('sos:triggered', (data: { sos: SosSignal }) => {
            setActiveSos(prev => [data.sos, ...prev]);
        });

        socket.on('sos:acked', (data: { sosId: string; ackedBy: string; ackedAt: string }) => {
            setActiveSos(prev => prev.map(s =>
                s.id === data.sosId ? { ...s, status: 'acked' as const, ackedBy: data.ackedBy, ackedAt: data.ackedAt } : s
            ));
        });

        socket.on('sos:resolved', (data: { sosId: string }) => {
            setActiveSos(prev => prev.filter(s => s.id !== data.sosId));
        });

        // Location events
        socket.on('location:broadcast', (data: LiveLocation & { missionSessionId: string }) => {
            setLiveLocations(prev => {
                const existing = prev.findIndex(l => l.userId === data.userId);
                if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = { ...data, isStale: false };
                    return updated;
                }
                return [...prev, { ...data, isStale: false }];
            });
        });

        socket.on('location:shareStopped', (data: { userId: string }) => {
            setLiveLocations(prev => prev.filter(l => l.userId !== data.userId));
        });

        socketRef.current = socket;

        return () => {
            socket.emit('mission:leave', { missionSessionId });
            socket.disconnect();
            socketRef.current = null;
        };
    }, [missionSessionId, token, userId, displayName, callsign, role]);

    // Initial data load
    const loadInitialData = useCallback(async () => {
        if (!missionSessionId || !token) return;

        try {
            setIsLoading(true);
            setError(null);

            const [reportsRes, sosRes, locationsRes] = await Promise.all([
                fieldReportsApi.getReports(missionSessionId, { limit: 100 }, token),
                fieldReportsApi.getActiveSos(missionSessionId, token),
                fieldReportsApi.getLiveLocations(missionSessionId, token),
            ]);

            setReports(reportsRes.data);
            lastCursorRef.current = reportsRes.cursor;
            setActiveSos(sosRes);

            // Convert GeoJSON to LiveLocation[]
            const locations = locationsRes.features.map(f => ({
                ...f.properties,
                lat: (f.geometry as GeoJSON.Point).coordinates[1],
                lng: (f.geometry as GeoJSON.Point).coordinates[0],
            })) as LiveLocation[];
            setLiveLocations(locations);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [missionSessionId, token]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Stale location checker
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setLiveLocations(prev => prev.map(l => ({
                ...l,
                isStale: new Date(l.lastAt).getTime() < now - 60000,
            })));
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    // Actions
    const createReport = useCallback(async (report: Parameters<typeof fieldReportsApi.createReport>[1]) => {
        const created = await fieldReportsApi.createReport(missionSessionId, report, token);
        // Will be added via WebSocket event
        return created;
    }, [missionSessionId, token]);

    const updateReport = useCallback(async (
        reportId: string,
        update: Parameters<typeof fieldReportsApi.updateReport>[1],
        version: number,
    ) => {
        return fieldReportsApi.updateReport(reportId, update, version, token);
    }, [token]);

    const triggerSos = useCallback(async (lat: number, lng: number, accuracyM?: number, message?: string) => {
        const result = await fieldReportsApi.triggerSos(missionSessionId, {
            latitude: lat,
            longitude: lng,
            accuracyM,
            message,
        }, token);
        return result;
    }, [missionSessionId, token]);

    const ackSos = useCallback(async (sosId: string, note?: string) => {
        await fieldReportsApi.ackSos(sosId, note, token);
    }, [token]);

    const resolveSos = useCallback(async (sosId: string, note?: string) => {
        await fieldReportsApi.resolveSos(sosId, note, token);
    }, [token]);

    return {
        reports,
        activeSos,
        liveLocations,
        isConnected,
        isLoading,
        error,
        createReport,
        updateReport,
        triggerSos,
        ackSos,
        resolveSos,
        refresh: loadInitialData,
    };
}

export default useFieldReports;
