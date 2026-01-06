/**
 * useNativeFeatures Hook
 * Provides access to native Capacitor features with React integration
 * Works even when Capacitor is not installed (falls back to web APIs)
 */

import { useState, useEffect, useCallback } from 'react';
import type { LocationData, CameraPhoto } from '../services/nativeBridge';

export interface UseNativeFeaturesReturn {
    isNative: boolean;
    initialized: boolean;

    // Location
    currentLocation: LocationData | null;
    locationLoading: boolean;
    refreshLocation: () => Promise<void>;
    startLocationTracking: () => Promise<void>;
    stopLocationTracking: () => void;

    // Camera
    takePhoto: () => Promise<CameraPhoto | null>;

    // Notifications
    notificationPermission: boolean;
    requestNotificationPermission: () => Promise<boolean>;
    sendNotification: (title: string, body: string, data?: Record<string, any>) => Promise<void>;

    // Haptics
    vibrate: (style?: 'light' | 'medium' | 'heavy') => Promise<void>;
}

export function useNativeFeatures(): UseNativeFeaturesReturn {
    const [initialized, setInitialized] = useState(false);
    const [isNative, setIsNative] = useState(false);
    const [bridge, setBridge] = useState<any>(null);

    const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [watchId, setWatchId] = useState<string | null>(null);

    const [notificationPermission, setNotificationPermission] = useState(false);

    // Initialize
    useEffect(() => {
        const init = async () => {
            try {
                const { nativeBridge } = await import('../services/nativeBridge');
                await nativeBridge.initialize();
                setBridge(nativeBridge);
                setIsNative(nativeBridge.isNativePlatform);
                setInitialized(true);

                // Check notification permission
                if ('Notification' in window) {
                    setNotificationPermission(Notification.permission === 'granted');
                }
            } catch {
                setInitialized(true);
            }
        };
        init();
    }, []);

    // Cleanup location tracking on unmount
    useEffect(() => {
        return () => {
            if (watchId && bridge) {
                bridge.clearWatch(watchId);
            }
        };
    }, [watchId, bridge]);

    // Location functions
    const refreshLocation = useCallback(async () => {
        if (!bridge) return;
        setLocationLoading(true);
        try {
            const location = await bridge.getCurrentPosition();
            if (location) {
                setCurrentLocation(location);
            }
        } finally {
            setLocationLoading(false);
        }
    }, [bridge]);

    const startLocationTracking = useCallback(async () => {
        if (!bridge || watchId) return;

        const id = await bridge.watchPosition((location: LocationData) => {
            setCurrentLocation(location);
        });

        if (id) {
            setWatchId(id);
        }
    }, [bridge, watchId]);

    const stopLocationTracking = useCallback(() => {
        if (watchId && bridge) {
            bridge.clearWatch(watchId);
            setWatchId(null);
        }
    }, [watchId, bridge]);

    // Camera
    const takePhoto = useCallback(async (): Promise<CameraPhoto | null> => {
        if (!bridge) return null;
        return bridge.takePhoto();
    }, [bridge]);

    // Notifications
    const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
        if (!bridge) return false;
        const granted = await bridge.requestNotificationPermission();
        setNotificationPermission(granted);
        return granted;
    }, [bridge]);

    const sendNotification = useCallback(async (
        title: string,
        body: string,
        data?: Record<string, any>
    ): Promise<void> => {
        if (!bridge) return;
        await bridge.sendLocalNotification({
            id: Date.now(),
            title,
            body,
            data,
        });
    }, [bridge]);

    // Haptics
    const vibrate = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
        if (!bridge) return;
        await bridge.vibrate(style);
    }, [bridge]);

    return {
        isNative,
        initialized,

        currentLocation,
        locationLoading,
        refreshLocation,
        startLocationTracking,
        stopLocationTracking,

        takePhoto,

        notificationPermission,
        requestNotificationPermission,
        sendNotification,

        vibrate,
    };
}

export default useNativeFeatures;
