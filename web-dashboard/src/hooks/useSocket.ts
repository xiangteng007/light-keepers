/**
 * useSocket.ts
 *
 * v5.0: Unified Socket Hook
 * 使用合併後的 RealtimeContext
 */
import { useEffect } from 'react';
import { useRealtime } from '../context/RealtimeContext';

export const useSocket = (event?: string, handler?: (data: any) => void) => {
    const { socket, isConnected, emit } = useRealtime();

    useEffect(() => {
        if (!socket || !isConnected || !event || !handler) return;

        socket.on(event, handler);

        return () => {
            socket.off(event, handler);
        };
    }, [socket, isConnected, event, handler]);

    const subscribe = (topic: string) => {
        emit('subscribe:topic', topic);
    };

    const unsubscribe = (topic: string) => {
        emit('unsubscribe:topic', topic);
    };

    return { socket, connected: isConnected, emit, subscribe, unsubscribe };
};
