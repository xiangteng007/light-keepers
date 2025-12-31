// Firebase Cloud Messaging Service Worker
// 處理背景推播通知

// 從環境變數或預設配置獲取 Firebase Config
// 注意：這些值會在建置時注入
const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyD_placeholder', // 會由 Firebase 自動處理
    projectId: 'light-keepers-mvp',
    messagingSenderId: '955234851806',
    appId: '1:955234851806:web:placeholder',
};

// 導入 Firebase Messaging SW
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 初始化 Firebase
try {
    firebase.initializeApp(FIREBASE_CONFIG);
    console.log('[FCM SW] Firebase initialized');
} catch (error) {
    console.error('[FCM SW] Firebase init error:', error);
}

// 獲取 Messaging 實例
const messaging = firebase.messaging();

// 處理背景推播
messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || '光守護者通知';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: payload.data?.notificationId || 'default',
        data: payload.data,
        actions: [
            {
                action: 'open',
                title: '查看',
            },
            {
                action: 'dismiss',
                title: '關閉',
            },
        ],
        requireInteraction: payload.data?.priority === 'urgent',
        vibrate: [200, 100, 200],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 處理通知點擊
self.addEventListener('notificationclick', (event) => {
    console.log('[FCM SW] Notification clicked:', event);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // 獲取目標 URL
    const actionUrl = event.notification.data?.actionUrl || '/dashboard';
    const targetUrl = new URL(actionUrl, self.location.origin).href;

    // 打開或聚焦到目標頁面
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 嘗試找到已打開的窗口
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // 如果沒有找到，打開新窗口
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// 處理推送事件 (備用)
self.addEventListener('push', (event) => {
    console.log('[FCM SW] Push event received:', event);

    if (event.data) {
        try {
            const payload = event.data.json();
            console.log('[FCM SW] Push payload:', payload);
        } catch (e) {
            console.log('[FCM SW] Push text:', event.data.text());
        }
    }
});

console.log('[FCM SW] Service Worker loaded');
