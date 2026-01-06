import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types matching backend WebSocket events
export interface PresenceUser {
    oderId: string;
    userName: string;
    avatar?: string;
    color: string;
    joinedAt: string;
}

export interface CursorPosition {
    oderId: string;
    userName: string;
    lng: number;
    lat: number;
    color: string;
}

export interface OverlayEvent {
    type: 'created' | 'updated' | 'published' | 'removed' | 'locked' | 'unlocked';
    overlayId: string;
    actor: string;
    data?: any;
    timestamp: string;
}

export interface LockInfo {
    overlayId: string;
    lockedBy: string;
    expiresAt: string;
}

interface UseOverlayCollaborationOptions {
    sessionId: string | null;
    userName: string;
    userAvatar?: string;
    onOverlayEvent?: (event: OverlayEvent) => void;
    onPresenceChange?: (users: PresenceUser[]) => void;
    onCursorMove?: (cursor: CursorPosition) => void;
    enabled?: boolean;
}

interface CollaborationState {
    isConnected: boolean;
    users: PresenceUser[];
    cursors: Map<string, CursorPosition>;
    locks: Map<string, LockInfo>;
}

// Generate a random color for cursor
function generateUserColor(): string {
    const colors = [
        '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
        '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
        '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

export function useOverlayCollaboration(options: UseOverlayCollaborationOptions) {
    const {
        sessionId,
        userName,
        userAvatar,
        onOverlayEvent,
        onPresenceChange,
        onCursorMove,
        enabled = true,
    } = options;

    const [state, setState] = useState<CollaborationState>({
        isConnected: false,
        users: [],
        cursors: new Map(),
        locks: new Map(),
    });

    const socketRef = useRef<Socket | null>(null);
    const userColorRef = useRef(generateUserColor());

    // Connect to WebSocket
    useEffect(() => {
        if (!sessionId || !enabled) return;

        const token = localStorage.getItem('accessToken');

        const socket = io(`${WS_URL}/overlays`, {
            auth: { token },
            query: { sessionId },
            transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
            console.log('[Collaboration] Connected to session:', sessionId);
            setState(s => ({ ...s, isConnected: true }));

            // Join session room
            socket.emit('join', {
                sessionId,
                userName,
                avatar: userAvatar,
                color: userColorRef.current,
            });
        });

        socket.on('disconnect', () => {
            console.log('[Collaboration] Disconnected');
            setState(s => ({ ...s, isConnected: false, users: [], cursors: new Map() }));
        });

        socket.on('connect_error', (err) => {
            console.error('[Collaboration] Connection error:', err.message);
        });

        // Presence events
        socket.on('presence:joined', (user: PresenceUser) => {
            console.log('[Collaboration] User joined:', user.userName);
            setState(s => {
                const users = [...s.users.filter(u => u.oderId !== user.oderId), user];
                onPresenceChange?.(users);
                return { ...s, users };
            });
        });

        socket.on('presence:left', (data: { oderId: string }) => {
            console.log('[Collaboration] User left:', data.oderId);
            setState(s => {
                const users = s.users.filter(u => u.oderId !== data.oderId);
                const cursors = new Map(s.cursors);
                cursors.delete(data.oderId);
                onPresenceChange?.(users);
                return { ...s, users, cursors };
            });
        });

        socket.on('presence:list', (users: PresenceUser[]) => {
            console.log('[Collaboration] Users list:', users.length);
            setState(s => ({ ...s, users }));
            onPresenceChange?.(users);
        });

        // Cursor events
        socket.on('cursor:move', (cursor: CursorPosition) => {
            setState(s => {
                const cursors = new Map(s.cursors);
                cursors.set(cursor.oderId, cursor);
                return { ...s, cursors };
            });
            onCursorMove?.(cursor);
        });

        // Overlay events
        socket.on('overlay:created', (event: OverlayEvent) => {
            onOverlayEvent?.({ ...event, type: 'created' });
        });

        socket.on('overlay:updated', (event: OverlayEvent) => {
            onOverlayEvent?.({ ...event, type: 'updated' });
        });

        socket.on('overlay:published', (event: OverlayEvent) => {
            onOverlayEvent?.({ ...event, type: 'published' });
        });

        socket.on('overlay:removed', (event: OverlayEvent) => {
            onOverlayEvent?.({ ...event, type: 'removed' });
        });

        // Lock events
        socket.on('overlay:locked', (lock: LockInfo) => {
            console.log('[Collaboration] Overlay locked:', lock);
            setState(s => {
                const locks = new Map(s.locks);
                locks.set(lock.overlayId, lock);
                return { ...s, locks };
            });
            onOverlayEvent?.({
                type: 'locked',
                overlayId: lock.overlayId,
                actor: lock.lockedBy,
                data: lock,
                timestamp: new Date().toISOString(),
            });
        });

        socket.on('overlay:unlocked', (data: { overlayId: string }) => {
            console.log('[Collaboration] Overlay unlocked:', data.overlayId);
            setState(s => {
                const locks = new Map(s.locks);
                locks.delete(data.overlayId);
                return { ...s, locks };
            });
            onOverlayEvent?.({
                type: 'unlocked',
                overlayId: data.overlayId,
                actor: '',
                timestamp: new Date().toISOString(),
            });
        });

        return () => {
            socket.emit('leave', { sessionId });
            socket.disconnect();
            socketRef.current = null;
        };
    }, [sessionId, userName, userAvatar, enabled, onOverlayEvent, onPresenceChange, onCursorMove]);

    // Broadcast cursor position
    const broadcastCursor = useCallback((lng: number, lat: number) => {
        socketRef.current?.emit('cursor:update', {
            lng,
            lat,
            color: userColorRef.current,
        });
    }, []);

    // Broadcast overlay event
    const broadcastOverlayEvent = useCallback((event: Omit<OverlayEvent, 'timestamp'>) => {
        socketRef.current?.emit(`overlay:${event.type}`, {
            ...event,
            timestamp: new Date().toISOString(),
        });
    }, []);

    return {
        ...state,
        userColor: userColorRef.current,
        broadcastCursor,
        broadcastOverlayEvent,
    };
}

export default useOverlayCollaboration;
