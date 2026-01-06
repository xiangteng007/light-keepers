/**
 * Notification Bell Component
 * Displays notification count and dropdown
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification } from '../../hooks/useNotifications';
import './NotificationBell.css';

export const NotificationBell: React.FC = () => {
    const {
        notifications,
        unreadCount,
        connected,
        markAsRead,
        markAllAsRead,
        clearNotification,
        requestPermission,
    } = useNotifications();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Request permission on mount
    useEffect(() => {
        requestPermission();
    }, [requestPermission]);

    const handleBellClick = () => {
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);

        // Navigate if actionUrl exists
        if (notification.data?.actionUrl) {
            window.location.href = notification.data.actionUrl;
        }
    };

    const getPriorityClass = (priority: string): string => {
        switch (priority) {
            case 'urgent': return 'priority-urgent';
            case 'high': return 'priority-high';
            case 'low': return 'priority-low';
            default: return 'priority-normal';
        }
    };

    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return '剛剛';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
        return date.toLocaleDateString('zh-TW');
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button
                className={`notification-bell-button ${connected ? 'connected' : 'disconnected'}`}
                onClick={handleBellClick}
                aria-label={`通知 ${unreadCount > 0 ? `(${unreadCount} 則未讀)` : ''}`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="bell-icon"
                >
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
                </svg>
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>通知</h3>
                        {unreadCount > 0 && (
                            <button
                                className="mark-all-read"
                                onClick={markAllAsRead}
                            >
                                全部標為已讀
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <p>沒有通知</p>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.read ? 'unread' : ''} ${getPriorityClass(notification.priority)}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-content">
                                        <h4>{notification.title}</h4>
                                        <p>{notification.body}</p>
                                        <span className="notification-time">
                                            {formatTime(notification.timestamp)}
                                        </span>
                                    </div>
                                    <button
                                        className="notification-dismiss"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearNotification(notification.id);
                                        }}
                                        aria-label="關閉通知"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 10 && (
                        <div className="notification-footer">
                            <a href="/notifications">查看全部通知</a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
