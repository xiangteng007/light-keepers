/**
 * SocketContext.tsx
 * 
 * v4.0: Socket.IO Context
 * 提供全站 WebSocket 連線管理
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
    lastPing: Date | null;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    connected: false,
    lastPing: null,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [lastPing, setLastPing] = useState<Date | null>(null);
    const { user } = useAuth();
    const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')) : null;

    useEffect(() => {
        if (!user || !token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setConnected(false);
            }
            return;
        }

        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3099';
        const wsUrl = socketUrl.replace('/api', '');

        const newSocket = io(wsUrl, {
            path: '/socket.io', // NestJS Gateway 預設路徑? 需確認，通常是 /socket.io
            // namespace: '/api/v1', // Gateway 定義的 namespace
            query: {
                userId: user.id,
            },
            auth: {
                token: `Bearer ${token}`,
            },
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        // Gateway namespace 是 /api/v1，所以 client 也要連到這個 namespace
        // io(url + '/api/v1')
        // 修正: 這裡用 path 會比較好控制，或是直接連 namespace

        // 重新初始化正確的 namespace socket
        const namespaceSocket = io(`${wsUrl}/api/v1`, {
            query: { userId: user.id },
            auth: { token: `Bearer ${token}` },
            transports: ['websocket'],
        });

        namespaceSocket.on('connect', () => {
            console.log('🔌 Socket connected');
            setConnected(true);
            setLastPing(new Date());
        });

        namespaceSocket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            setConnected(false);
        });

        namespaceSocket.on('connect_error', (err) => {
            console.error('🔌 Socket connection error:', err);
        });

        namespaceSocket.on('ping', () => setLastPing(new Date()));

        setSocket(namespaceSocket);

        return () => {
            namespaceSocket.disconnect();
        };
    }, [user?.id, token]); // Re-connect when user/token changes

    return (
        <SocketContext.Provider value={{ socket, connected, lastPing }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocketContext = () => useContext(SocketContext);
