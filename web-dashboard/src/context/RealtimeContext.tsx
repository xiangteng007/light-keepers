import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { socketLogger } from '../utils/logger';
import { API_BASE_URL } from '../api/config';

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

// Context 類型
interface RealtimeContextType {
    isConnected: boolean;
    onlineCount: number;
    alerts: Alert[];
    taskUpdates: TaskUpdate[];
    joinRoom: (room: string) => void;
    leaveRoom: (room: string) => void;
    clearAlerts: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// API URL for WebSocket
const WS_URL = import.meta.env.VITE_WS_URL || API_BASE_URL;

export function RealtimeProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [taskUpdates, setTaskUpdates] = useState<TaskUpdate[]>([]);

    // 初始化 Socket 連線
    useEffect(() => {
        // 🔧 DevMode 時跳過 WebSocket 連接（本地開發不需要）
        const devModeEnabled = localStorage.getItem('devModeUser') === 'true';
        if (devModeEnabled) {
            socketLogger.debug('WebSocket skipped in dev mode');
            return;
        }

        // Connect to root namespace (not /realtime - backend may not have it)
        const newSocket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 3,
            reconnectionDelay: 2000,
            timeout: 10000,
        });

        newSocket.on('connect', () => {
            socketLogger.info('WebSocket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            socketLogger.info('WebSocket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            socketLogger.error('WebSocket connection error:', error);
        });

        // 線上人數
        newSocket.on('onlineCount', (data: { count: number }) => {
            setOnlineCount(data.count);
        });

        // 災害警報
        newSocket.on('alert', (alert: Alert) => {
            socketLogger.debug('Received alert:', alert);
            setAlerts(prev => [alert, ...prev].slice(0, 50)); // 保留最新 50 筆
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
    }, []);

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

    const value: RealtimeContextType = {
        isConnected,
        onlineCount,
        alerts,
        taskUpdates,
        joinRoom,
        leaveRoom,
        clearAlerts,
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
