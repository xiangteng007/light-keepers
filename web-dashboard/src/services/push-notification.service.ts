/**
 * Push Notification Service
 * 處理 FCM 推播通知的前端整合
 */

import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import type { Messaging, MessagePayload } from 'firebase/messaging';
import firebaseConfig from '../config/firebase.config';

const API_BASE = import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1';
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export interface PushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}

class PushNotificationService {
    private app: FirebaseApp | null = null;
    private messaging: Messaging | null = null;
    private isInitialized = false;
    private currentToken: string | null = null;

    /**
     * 初始化 Firebase Messaging
     */
    async init(): Promise<boolean> {
        if (this.isInitialized) {
            return true;
        }

        try {
            // 檢查瀏覽器是否支援通知
            if (!('Notification' in window)) {
                console.warn('[Push] Notifications not supported');
                return false;
            }

            // 檢查 Service Worker 是否支援
            if (!('serviceWorker' in navigator)) {
                console.warn('[Push] Service Worker not supported');
                return false;
            }

            // 初始化 Firebase App
            if (getApps().length === 0) {
                this.app = initializeApp(firebaseConfig);
            } else {
                this.app = getApps()[0];
            }

            // 獲取 Messaging 實例
            this.messaging = getMessaging(this.app);
            this.isInitialized = true;

            console.log('[Push] Firebase Messaging initialized');
            return true;
        } catch (error) {
            console.error('[Push] Init failed:', error);
            return false;
        }
    }

    /**
     * 請求通知權限並獲取 FCM Token
     */
    async requestPermissionAndGetToken(): Promise<string | null> {
        try {
            // 請求通知權限
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('[Push] Notification permission denied');
                return null;
            }

            // 確保已初始化
            if (!this.isInitialized) {
                await this.init();
            }

            if (!this.messaging) {
                console.error('[Push] Messaging not initialized');
                return null;
            }

            // 註冊 Service Worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('[Push] Service Worker registered:', registration.scope);

            // 獲取 FCM Token
            const token = await getToken(this.messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration,
            });

            if (token) {
                this.currentToken = token;
                console.log('[Push] FCM Token obtained');
                return token;
            } else {
                console.warn('[Push] No FCM token available');
                return null;
            }
        } catch (error) {
            console.error('[Push] Failed to get token:', error);
            return null;
        }
    }

    /**
     * 向後端註冊 FCM Token
     */
    async registerWithBackend(accountId: string, fcmToken: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE}/notifications/fcm/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
                },
                body: JSON.stringify({ accountId, fcmToken }),
            });

            const data = await response.json();
            console.log('[Push] Token registered with backend:', data.success);
            return data.success;
        } catch (error) {
            console.error('[Push] Failed to register token with backend:', error);
            return false;
        }
    }

    /**
     * 向後端取消註冊 FCM Token
     */
    async unregisterFromBackend(accountId: string, fcmToken: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE}/notifications/fcm/unregister`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
                },
                body: JSON.stringify({ accountId, fcmToken }),
            });

            const data = await response.json();
            console.log('[Push] Token unregistered from backend:', data.success);
            return data.success;
        } catch (error) {
            console.error('[Push] Failed to unregister token from backend:', error);
            return false;
        }
    }

    /**
     * 一鍵啟用推播通知
     * 請求權限 -> 獲取 Token -> 向後端註冊
     */
    async enablePushNotifications(accountId: string): Promise<boolean> {
        const token = await this.requestPermissionAndGetToken();
        if (!token) {
            return false;
        }

        return this.registerWithBackend(accountId, token);
    }

    /**
     * 停用推播通知
     */
    async disablePushNotifications(accountId: string): Promise<boolean> {
        if (this.currentToken) {
            await this.unregisterFromBackend(accountId, this.currentToken);
        }
        this.currentToken = null;
        return true;
    }

    /**
     * 監聽前景推播
     */
    onForegroundMessage(callback: (payload: MessagePayload) => void): void {
        if (!this.messaging) {
            console.warn('[Push] Messaging not initialized');
            return;
        }

        onMessage(this.messaging, (payload) => {
            console.log('[Push] Foreground message received:', payload);
            callback(payload);
        });
    }

    /**
     * 檢查通知權限狀態
     */
    getPermissionStatus(): NotificationPermission {
        if (!('Notification' in window)) {
            return 'denied';
        }
        return Notification.permission;
    }

    /**
     * 檢查是否已啟用推播
     */
    isEnabled(): boolean {
        return this.currentToken !== null;
    }

    /**
     * 獲取當前 Token
     */
    getCurrentToken(): string | null {
        return this.currentToken;
    }
}

// 單例導出
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
