import { useState, useEffect, useCallback, useRef } from 'react';
import { fieldReportsApi } from '../services/fieldReportsApi';

interface UseLocationShareOptions {
    missionSessionId: string;
    token: string;
    enabled?: boolean;
}

interface UseLocationShareReturn {
    isSharing: boolean;
    mode: 'off' | 'mission' | 'sos';
    lastUpdate: Date | null;
    accuracy: number | null;
    error: string | null;
    startSharing: (mode: 'mission' | 'sos') => Promise<void>;
    stopSharing: () => Promise<void>;
}

/**
 * Hook for managing location sharing on field worker devices
 */
export function useLocationShare({
    missionSessionId,
    token,
    enabled: _enabled = true,
}: UseLocationShareOptions): UseLocationShareReturn {
    const [isSharing, setIsSharing] = useState(false);
    const [mode, setMode] = useState<'off' | 'mission' | 'sos'>('off');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const watchIdRef = useRef<number | null>(null);
    const socketRef = useRef<any>(null);

    // Start location sharing
    const startSharing = useCallback(async (shareMode: 'mission' | 'sos') => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            return;
        }

        try {
            // Register with backend
            await fieldReportsApi.startLocationShare(missionSessionId, shareMode, token);
            setMode(shareMode);
            setIsSharing(true);
            setError(null);

            // Start watching position
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy: acc, heading, speed } = position.coords;
                    setAccuracy(acc);
                    setLastUpdate(new Date());

                    // Send update via WebSocket if connected
                    if (socketRef.current?.connected) {
                        socketRef.current.emit('location:update', {
                            missionSessionId,
                            lat: latitude,
                            lng: longitude,
                            accuracyM: acc,
                            heading,
                            speed,
                            mode: shareMode,
                            tsClient: new Date().toISOString(),
                        });
                    }
                },
                (err) => {
                    setError(`Location error: ${err.message}`);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000,
                },
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start sharing');
        }
    }, [missionSessionId, token]);

    // Stop location sharing
    const stopSharing = useCallback(async () => {
        try {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }

            await fieldReportsApi.stopLocationShare(missionSessionId, token);
            setIsSharing(false);
            setMode('off');
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to stop sharing');
        }
    }, [missionSessionId, token]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return {
        isSharing,
        mode,
        lastUpdate,
        accuracy,
        error,
        startSharing,
        stopSharing,
    };
}

export default useLocationShare;
