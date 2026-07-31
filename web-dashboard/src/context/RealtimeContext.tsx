/**
 * RealtimeContext.tsx
 *
 * v5.0: Unified Realtime Context
 * 合併了原本的 SocketContext 和 RealtimeContext 為單一 WebSocket 管理
 *
 * 功能:
 * - 認證連線（附帶 JWT token）
 * - 災害警報接收
 * - 任務更新接收
 * - 線上人數
 * - room 加入/離開
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { socketLogger } from '../utils/logger';
import { API_BASE_URL } from '../api/config';
import { isDevModeUser } from '../utils/devMode';

// 警報類型
interface Alert {
    id?: string;
    type: string;
    title?: string;
    message?: string;
    severity?: string;
    timestamp: Date;
}

// 任務更新類型
interface TaskUpdate {
    taskId: string;
    status?: string;
    title?: string;
    timestamp?: Date;
}

// 統一 Context 類型（合併 SocketContext + RealtimeContext）
interface RealtimeContextType {
    // Socket instance (from SocketContext)
    socket: Socket | null;
    // Connection state
    isConnected: boolean;
    lastPing: Date | null;
    // Realtime data
    onlineCount: number;
    alerts: Alert[];
    taskUpdates: TaskUpdate[];
    // Room management
    joinRoom: (room: string) => void;
    leaveRoom: (room: string) => void;
    clearAlerts: () => void;
    // Socket helpers (from useSocket pattern)
    emit: (event: string, data: any) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// WebSocket URL
const WS_URL = import.meta.env.VITE_WS_URL || API_BASE_URL;

export function RealtimeProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastPing, setLastPing] = useState<Date | null>(null);
    const [onlineCount, setOnlineCount] = useState(0);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [taskUpdates, setTaskUpdates] = useState<TaskUpdate[]>([]);
    const { user } = useAuth();

    // Token 取得（合併自 SocketContext）
    const token = typeof window !== 'undefined'
        ? (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))
        : null;

    // 初始化 Socket 連線
    useEffect(() => {
        // 🔧 DevMode 時跳過 WebSocket 連接（僅 DEV build 有效）
        const devModeEnabled = isDevModeUser();
        if (devModeEnabled) {
            socketLogger.debug('WebSocket skipped in dev mode');
            return;
        }

        const socketOptions: any = {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            timeout: 10000,
        };

        // 如果有認證用戶，附帶 auth 資訊
        if (user && token) {
            socketOptions.query = { userId: user.id };
            socketOptions.auth = { token: `Bearer ${token}` };
        }

        const newSocket = io(WS_URL, socketOptions);

        newSocket.on('connect', () => {
            socketLogger.info('WebSocket connected');
            setIsConnected(true);
            setLastPing(new Date());
        });

        newSocket.on('disconnect', () => {
            socketLogger.info('WebSocket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            socketLogger.error('WebSocket connection error:', error);
        });

        newSocket.on('ping', () => setLastPing(new Date()));

        // 線上人數
        newSocket.on('onlineCount', (data: { count: number }) => {
            setOnlineCount(data.count);
        });

        // 災害警報
        newSocket.on('alert', (alert: Alert) => {
            socketLogger.debug('Received alert:', alert);
            setAlerts(prev => [alert, ...prev].slice(0, 50));
        });

        // 通知
        newSocket.on('notification', (notification: Alert) => {
            socketLogger.debug('Received notification:', notification);
            setAlerts(prev => [notification, ...prev].slice(0, 50));
        });

        // 任務更新
        newSocket.on('taskUpdate', (update: TaskUpdate) => {
            socketLogger.debug('Task update:', update);
            setTaskUpdates(prev => [update, ...prev].slice(0, 20));
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user?.id, token]);

    // 加入房間
    const joinRoom = useCallback((room: string) => {
        if (socket) {
            socket.emit('joinRoom', { room });
        }
    }, [socket]);

    // 離開房間
    const leaveRoom = useCallback((room: string) => {
        if (socket) {
            socket.emit('leaveRoom', { room });
        }
    }, [socket]);

    // 清除警報
    const clearAlerts = useCallback(() => {
        setAlerts([]);
    }, []);

    // emit helper
    const emit = useCallback((event: string, data: any) => {
        if (socket && isConnected) {
            socket.emit(event, data);
        }
    }, [socket, isConnected]);

    const value: RealtimeContextType = {
        socket,
        isConnected,
        lastPing,
        onlineCount,
        alerts,
        taskUpdates,
        joinRoom,
        leaveRoom,
        clearAlerts,
        emit,
    };

    return (
        <RealtimeContext.Provider value={value}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    const context = useContext(RealtimeContext);
    if (context === undefined) {
        throw new Error('useRealtime must be used within a RealtimeProvider');
    }
    return context;
}

// 向後相容 SocketContext exports
export const useSocketContext = useRealtime;
