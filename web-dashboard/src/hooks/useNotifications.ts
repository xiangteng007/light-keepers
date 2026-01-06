/**
 * useNotifications Hook
 * Real-time notification management with WebSocket integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    timestamp: string;
    read: boolean;
}

export interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    connected: boolean;

    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotification: (id: string) => void;
    clearAll: () => void;

    requestPermission: () => Promise<boolean>;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = API_BASE.replace(/^http/, 'ws');

export function useNotifications(): UseNotificationsReturn {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Connect to WebSocket
    useEffect(() => {
        if (!user?.id) return;

        const connect = () => {
            const socket = io(`${WS_URL}/notifications`, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            socket.on('connect', () => {
                console.log('[Notifications] Connected');
                setConnected(true);
                socket.emit('subscribe', { userId: user.id });
            });

            socket.on('disconnect', () => {
                console.log('[Notifications] Disconnected');
                setConnected(false);
            });

            socket.on('subscribed', (data) => {
                console.log('[Notifications] Subscribed:', data);
            });

            socket.on('notification', (data: Omit<Notification, 'id' | 'read'>) => {
                console.log('[Notifications] Received:', data);

                const notification: Notification = {
                    ...data,
                    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    read: false,
                };

                setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50

                // Show browser notification if permitted
                if (Notification.permission === 'granted') {
                    new Notification(data.title, {
                        body: data.body,
                        icon: '/icons/notification-icon.png',
                        tag: notification.id,
                    });
                }

                // Play sound for urgent notifications
                if (data.priority === 'urgent') {
                    playNotificationSound();
                }
            });

            socket.on('error', (error) => {
                console.error('[Notifications] Error:', error);
            });

            socketRef.current = socket;
        };

        connect();

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('unsubscribe', { userId: user.id });
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [user?.id]);

    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    // Mark single notification as read
    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    // Clear single notification
    const clearNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Clear all notifications
    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Request browser notification permission
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission === 'denied') {
            return false;
        }

        const result = await Notification.requestPermission();
        return result === 'granted';
    }, []);

    return {
        notifications,
        unreadCount,
        connected,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        requestPermission,
    };
}

// Helper to play notification sound
function playNotificationSound(): void {
    try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
            // Ignore autoplay restrictions
        });
    } catch {
        // Audio not available
    }
}

export default useNotifications;
