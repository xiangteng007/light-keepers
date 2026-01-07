/**
 * Light Keepers PWA Service Worker
 * Phase 6: 離線功能實作
 * 
 * 快取策略：
 * - Cache-First: 靜態資源 (JS, CSS, 圖片, 字體)
 * - Network-First: API 請求
 * - Stale-While-Revalidate: SOP 文件
 * - Offline Fallback: 離線頁面
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
    static: `light-keepers-static-${CACHE_VERSION}`,
    api: `light-keepers-api-${CACHE_VERSION}`,
    sop: `light-keepers-sop-${CACHE_VERSION}`,
    offline: `light-keepers-offline-${CACHE_VERSION}`,
};

// 預載快取資源
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
    '/offline.html',
];

// 需要快取的 API 端點 (離線可用)
const CACHEABLE_API_PATHS = [
    '/api/sop/',
    '/api/documents/',
    '/api/events/types',
    '/api/volunteers/skills',
];

// ==================== Install ====================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        Promise.all([
            // 快取靜態資源
            caches.open(CACHE_NAMES.static).then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS).catch((err) => {
                    console.warn('[SW] Some static assets failed to cache:', err);
                });
            }),
            // 建立離線快取
            caches.open(CACHE_NAMES.offline),
        ]).then(() => {
            console.log('[SW] Installation complete');
            return self.skipWaiting();
        })
    );
});

// ==================== Activate ====================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        // 刪除舊版本快取
                        return name.startsWith('light-keepers-') &&
                            !Object.values(CACHE_NAMES).includes(name);
                    })
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

// ==================== Fetch ====================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 跳過非 GET 請求
    if (request.method !== 'GET') {
        return;
    }

    // 跳過 chrome-extension 和其他非 http(s) 請求
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // API 請求
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // SOP 文件
    if (url.pathname.startsWith('/sop/') || url.pathname.includes('/documents/')) {
        event.respondWith(handleSopRequest(request));
        return;
    }

    // 靜態資源
    event.respondWith(handleStaticRequest(request));
});

// ==================== 請求處理策略 ====================

/**
 * 靜態資源: Cache-First
 */
async function handleStaticRequest(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAMES.static);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.log('[SW] Static fetch failed, returning offline page');
        const offlinePage = await caches.match('/offline.html');
        return offlinePage || new Response('Offline', { status: 503 });
    }
}

/**
 * API 請求: Network-First (可快取端點)
 */
async function handleApiRequest(request) {
    const url = new URL(request.url);
    const isCacheable = CACHEABLE_API_PATHS.some(path => url.pathname.startsWith(path));

    try {
        const response = await fetch(request);

        // 快取可離線使用的 API 響應
        if (response.ok && isCacheable) {
            const cache = await caches.open(CACHE_NAMES.api);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log('[SW] API fetch failed, checking cache:', request.url);

        // 嘗試從快取獲取
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }

        // 返回離線 JSON 響應
        return new Response(
            JSON.stringify({
                error: 'offline',
                message: '目前處於離線狀態，資料可能不是最新的',
                cached: false,
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

/**
 * SOP 文件: Stale-While-Revalidate
 */
async function handleSopRequest(request) {
    const cache = await caches.open(CACHE_NAMES.sop);
    const cached = await cache.match(request);

    // 背景更新
    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => null);

    // 返回快取或等待網路
    if (cached) {
        // 非同步更新快取
        fetchPromise;
        return cached;
    }

    const response = await fetchPromise;
    if (response) {
        return response;
    }

    return new Response('SOP 文件離線不可用', { status: 503 });
}

// ==================== 離線同步佇列 ====================

const offlineQueue = [];

/**
 * 新增離線請求到佇列
 */
function queueOfflineRequest(request, data) {
    offlineQueue.push({
        id: Date.now().toString(36),
        url: request.url,
        method: request.method,
        body: data,
        timestamp: Date.now(),
    });

    // 儲存到 IndexedDB
    saveQueueToStorage();
}

/**
 * 處理同步事件
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Sync event:', event.tag);

    if (event.tag === 'offline-sync') {
        event.waitUntil(processOfflineQueue());
    }
});

/**
 * 處理離線佇列
 */
async function processOfflineQueue() {
    if (offlineQueue.length === 0) {
        return;
    }

    console.log('[SW] Processing offline queue:', offlineQueue.length, 'items');

    const results = [];

    for (const item of [...offlineQueue]) {
        try {
            const response = await fetch(item.url, {
                method: item.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.body),
            });

            if (response.ok) {
                // 從佇列移除
                const index = offlineQueue.findIndex(q => q.id === item.id);
                if (index > -1) {
                    offlineQueue.splice(index, 1);
                }
                results.push({ id: item.id, success: true });
            } else {
                results.push({ id: item.id, success: false, status: response.status });
            }
        } catch (error) {
            console.error('[SW] Failed to sync item:', item.id, error);
            results.push({ id: item.id, success: false, error: error.message });
        }
    }

    // 儲存剩餘佇列
    saveQueueToStorage();

    // 通知客戶端同步結果
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'SYNC_COMPLETE',
            results,
        });
    });

    return results;
}

/**
 * 儲存佇列到 localStorage (簡化版)
 */
function saveQueueToStorage() {
    // 在正式實作中應使用 IndexedDB
    try {
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'QUEUE_UPDATE',
                    queue: offlineQueue,
                });
            });
        });
    } catch (error) {
        console.error('[SW] Failed to save queue:', error);
    }
}

// ==================== 訊息處理 ====================

self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CACHE_SOP':
            // 預載 SOP 文件
            cacheSopDocuments(data.sopUrls);
            break;

        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.source.postMessage({ type: 'CACHE_CLEARED' });
            });
            break;

        case 'GET_QUEUE':
            event.source.postMessage({
                type: 'QUEUE_STATUS',
                queue: offlineQueue,
            });
            break;

        case 'QUEUE_REQUEST':
            queueOfflineRequest(
                { url: data.url, method: data.method },
                data.body
            );
            break;
    }
});

/**
 * 預載 SOP 文件
 */
async function cacheSopDocuments(urls) {
    if (!urls || urls.length === 0) return;

    const cache = await caches.open(CACHE_NAMES.sop);

    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log('[SW] Cached SOP:', url);
            }
        } catch (error) {
            console.warn('[SW] Failed to cache SOP:', url, error);
        }
    }
}

/**
 * 清除所有快取
 */
async function clearAllCaches() {
    const names = await caches.keys();
    await Promise.all(
        names.filter(n => n.startsWith('light-keepers-')).map(n => caches.delete(n))
    );
    console.log('[SW] All caches cleared');
}

console.log('[SW] Light Keepers PWA Service Worker loaded');
