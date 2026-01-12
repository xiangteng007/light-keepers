/**
 * useSocket.ts
 * 
 * v4.0: Socket Hook
 * 簡化 Socket 事件訂閱
 */
import { useEffect } from 'react';
import { useSocketContext } from '../context/SocketContext';

export const useSocket = (event?: string, handler?: (data: any) => void) => {
    const { socket, connected } = useSocketContext();

    useEffect(() => {
        if (!socket || !connected || !event || !handler) return;

        socket.on(event, handler);

        return () => {
            socket.off(event, handler);
        };
    }, [socket, connected, event, handler]);

    const emit = (eventName: string, data: any) => {
        if (socket && connected) {
            socket.emit(eventName, data);
        }
    };

    const subscribe = (topic: string) => {
        emit('subscribe:topic', topic);
    };

    const unsubscribe = (topic: string) => {
        emit('unsubscribe:topic', topic);
    };

    return { socket, connected, emit, subscribe, unsubscribe };
};
