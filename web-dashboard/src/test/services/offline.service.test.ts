/**
 * FE-4 / 工作項 3.4：離線 outbox 單元測試
 *
 * 硬要求：**離線資料不遺失**。本檔的存在理由是釘死「什麼情況下才允許刪除佇列項目」——
 * 只有真正 2xx。其餘任何情況（網路錯誤、5xx、401 且 refresh 失敗、超過重試上限）
 * 都必須保留資料。
 *
 * 涵蓋：
 * - 入列（queueSync / queueReport / queueSos / queueLocation）
 * - 上線事件觸發重放
 * - 重放順序（FIFO）
 * - 失敗重試不遺失（retryCount / lastError / 退避）
 * - 401 → refreshAccessToken() → 重試（refresh 失敗也不丟資料）
 * - 重放成功後清除 + lastSyncAt 更新
 *
 * 環境：`src/test/setup.ts` 已載入 `fake-indexeddb/auto`，因此 Dexie 走的是真實
 * IndexedDB 語意（而非 stub）。HTTP 層則 mock 掉 `src/api/client`，讓測試能精確
 * 控制 2xx / 5xx / 401 與 refresh 結果。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ===== Mock: src/api/client =====
// 必須 hoist 在 import offline.service 之前（vi.mock 自動 hoist）。
const mockRequest = vi.fn();
const mockRefreshAccessToken = vi.fn();

vi.mock('../../api/client', () => ({
    default: {
        request: (...args: unknown[]) => mockRequest(...args),
    },
    refreshAccessToken: (...args: unknown[]) => mockRefreshAccessToken(...args),
    getStoredToken: vi.fn(() => 'test-token'),
    storeToken: vi.fn(),
    clearToken: vi.fn(),
}));

import { offlineService } from '../../services/offline/offline.service';

/** 建構一個 axios 形狀的 HTTP 錯誤 */
function httpError(status: number, message = `Request failed with status code ${status}`) {
    const err = new Error(message) as Error & {
        isAxiosError: boolean;
        response: { status: number; data: unknown };
    };
    err.isAxiosError = true;
    err.response = { status, data: { message } };
    return err;
}

/**
 * 設定 navigator.onLine。
 *
 * 刻意**不**派發 online/offline 事件：service 的 online listener 會自動觸發重放，
 * 會與測試裡顯式呼叫的 attemptSync() 競爭（先進入的那個會拿走 isSyncing 鎖，
 * 讓另一個直接 return）。需要驗證事件行為的測試自行派發（見「上線觸發重放」）。
 */
function setOnline(online: boolean) {
    Object.defineProperty(navigator, 'onLine', {
        value: online,
        configurable: true,
        writable: true,
    });
}

describe('offline.service — 離線 outbox', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        offlineService.stopAutoSync();
        await offlineService.clearAllData();
        // 預設：離線（避免入列時就自動重放，污染各測試的 mock 呼叫次數）
        setOnline(false);
        vi.clearAllMocks();
        mockRequest.mockResolvedValue({ status: 200, data: {} });
        mockRefreshAccessToken.mockResolvedValue('new-token');
    });

    afterEach(() => {
        offlineService.stopAutoSync();
        vi.restoreAllMocks();
    });

    // ===================== 入列 =====================

    describe('入列', () => {
        it('queueSync 寫入佇列，getPendingCount / getPendingChanges 反映結果', async () => {
            await offlineService.queueSync('update', 'task', 'task-1', { status: 'completed' });

            expect(await offlineService.getPendingCount()).toBe(1);

            const pending = await offlineService.getPendingChanges();
            expect(pending).toHaveLength(1);
            expect(pending[0]).toMatchObject({
                type: 'update',
                entity: 'task',
                entityId: 'task-1',
                data: { status: 'completed' },
                retryCount: 0,
            });
            expect(pending[0].createdAt).toBeTypeOf('number');
        });

        it('離線時不會發出任何 HTTP 請求', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });
            await offlineService.attemptSync();

            expect(mockRequest).not.toHaveBeenCalled();
            expect(await offlineService.getPendingCount()).toBe(1);
        });

        it('queueReport / queueSos / queueLocation 存下 missionSessionId 與 payload', async () => {
            await offlineService.queueReport('ms-1', { title: '土石流', severity: 'high' });
            await offlineService.queueSos('ms-1', { lat: 25.0, lng: 121.5 });
            await offlineService.queueLocation('ms-1', { lat: 25.1, lng: 121.6 });

            const pending = await offlineService.getPendingChanges();
            expect(pending).toHaveLength(3);
            expect(pending.map((p) => p.entity)).toEqual(['report', 'sos', 'location']);
            expect(pending[0].data).toMatchObject({
                missionSessionId: 'ms-1',
                payload: { title: '土石流', severity: 'high' },
            });
        });

        it('updateTaskOffline 同時更新本地快取與入列', async () => {
            await offlineService.cacheTasks([
                {
                    id: 'task-9',
                    title: '搬運物資',
                    status: 'pending',
                    priority: 'high',
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-01T00:00:00Z',
                    cachedAt: 0,
                },
            ]);

            await offlineService.updateTaskOffline('task-9', { status: 'completed' });

            expect((await offlineService.getTask('task-9'))?.status).toBe('completed');
            expect(await offlineService.getPendingCount()).toBe(1);
        });
    });

    // ===================== 上線觸發重放 =====================

    describe('上線觸發重放', () => {
        it('online 事件會自動重放佇列', async () => {
            await offlineService.queueSync('create', 'task', 'local-1', { title: 'A' });
            expect(await offlineService.getPendingCount()).toBe(1);

            setOnline(true);
            window.dispatchEvent(new Event('online'));
            // online listener 內部是 async，等待其完成
            await vi.waitFor(async () => {
                expect(await offlineService.getPendingCount()).toBe(0);
            });

            expect(mockRequest).toHaveBeenCalledTimes(1);
        });
    });

    // ===================== 重放順序 =====================

    describe('重放順序', () => {
        it('依入列先後 FIFO 重放', async () => {
            await offlineService.queueSync('create', 'task', 'first', { n: 1 });
            await offlineService.queueSync('create', 'task', 'second', { n: 2 });
            await offlineService.queueSync('create', 'task', 'third', { n: 3 });

            setOnline(true);
            await offlineService.attemptSync({ force: true });

            const bodies = mockRequest.mock.calls.map(
                (c) => (c[0] as { data: { n: number } }).data.n
            );
            expect(bodies).toEqual([1, 2, 3]);
        });

        it('單筆失敗不會阻擋後續項目', async () => {
            await offlineService.queueSync('create', 'task', 'a', { n: 1 });
            await offlineService.queueSync('create', 'task', 'b', { n: 2 });

            mockRequest
                .mockRejectedValueOnce(httpError(500))
                .mockResolvedValueOnce({ status: 201, data: {} });

            setOnline(true);
            const result = await offlineService.attemptSync({ force: true });

            expect(result).toMatchObject({ success: 1, failed: 1 });
            // 失敗的那筆保留，成功的那筆被刪除
            const pending = await offlineService.getPendingChanges();
            expect(pending).toHaveLength(1);
            expect(pending[0].entityId).toBe('a');
        });
    });

    // ===================== 路徑 / 方法對應 =====================

    describe('請求對應（路徑走 client baseURL，已含 /api/v1）', () => {
        it.each([
            ['create', 'task', 't1', {}, 'post', '/tasks'],
            ['update', 'task', 't1', {}, 'put', '/tasks/t1'],
            ['delete', 'task', 't1', {}, 'delete', '/tasks/t1'],
            ['create', 'resource', 'r1', {}, 'post', '/resources'],
            ['update', 'resource', 'r1', {}, 'patch', '/resources/r1'],
        ] as const)(
            '%s %s → %s',
            async (type, entity, entityId, data, method, url) => {
                await offlineService.queueSync(type, entity, entityId, data);
                setOnline(true);
                await offlineService.attemptSync({ force: true });

                expect(mockRequest).toHaveBeenCalledWith(
                    expect.objectContaining({ method, url })
                );
            }
        );

        it('report / sos / location 走 mission-sessions 路徑', async () => {
            await offlineService.queueReport('ms-7', { title: 'x' });
            await offlineService.queueSos('ms-7', { lat: 1 });
            await offlineService.queueLocation('ms-7', { lat: 2 });

            setOnline(true);
            await offlineService.attemptSync({ force: true });

            const urls = mockRequest.mock.calls.map((c) => (c[0] as { url: string }).url);
            expect(urls).toEqual([
                '/mission-sessions/ms-7/reports',
                '/mission-sessions/ms-7/sos',
                '/mission-sessions/ms-7/location/update',
            ]);
        });
    });

    // ===================== 失敗重試不遺失 =====================

    describe('失敗重試不遺失', () => {
        it('網路錯誤後項目仍在佇列，retryCount 遞增且記錄 lastError', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });
            mockRequest.mockRejectedValue(new Error('Network Error'));

            setOnline(true);
            const result = await offlineService.attemptSync({ force: true });

            expect(result).toMatchObject({ success: 0, failed: 1 });

            const pending = await offlineService.getPendingChanges();
            expect(pending).toHaveLength(1);
            expect(pending[0].retryCount).toBe(1);
            expect(pending[0].lastError).toContain('Network Error');
        });

        it('組不出請求的畸形項目也不刪除（缺 missionSessionId）', async () => {
            // report 需要 missionSessionId 才能組出路徑；缺了就無法送出，
            // 但**仍不得刪除**——寧可留著等人工處理，也不能靜默丟資料。
            await offlineService.queueSync('create', 'report', 'r1', {});

            setOnline(true);
            const result = await offlineService.attemptSync({ force: true });

            expect(mockRequest).not.toHaveBeenCalled();
            expect(result.failed).toBe(1);

            const pending = await offlineService.getPendingChanges();
            expect(pending).toHaveLength(1);
            expect(pending[0].lastError).toContain('malformed');
        });

        it('5xx 不視為成功，資料保留', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });
            mockRequest.mockRejectedValue(httpError(503));

            setOnline(true);
            await offlineService.attemptSync({ force: true });

            expect(await offlineService.getPendingCount()).toBe(1);
        });

        it('失敗後套用指數退避：未到期的項目會被跳過但保留', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });
            mockRequest.mockRejectedValueOnce(httpError(500));

            setOnline(true);
            await offlineService.attemptSync({ force: true });
            expect(mockRequest).toHaveBeenCalledTimes(1);

            // 立刻再同步一次（非 force）：仍在退避視窗內 → 跳過
            const second = await offlineService.attemptSync();
            expect(second.skipped).toBe(1);
            expect(mockRequest).toHaveBeenCalledTimes(1);
            expect(await offlineService.getPendingCount()).toBe(1);
        });

        it('退避時間過後會自動重試並成功清除', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });
            mockRequest.mockRejectedValueOnce(httpError(500));

            setOnline(true);
            await offlineService.attemptSync({ force: true });

            const [item] = await offlineService.getPendingChanges();
            expect(item.nextAttemptAt).toBeGreaterThan(Date.now());

            // 快轉到退避到期之後。
            // 注意：這裡**不能**用 vi.useFakeTimers()——fake-indexeddb 依賴真實
            // timer/microtask 排程，假 timer 會讓 Dexie 的交易永遠不 resolve。
            // 只 stub Date.now 即可，因為退避判斷只看時間戳。
            const realNow = Date.now();
            const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(item.nextAttemptAt! + 1);

            try {
                mockRequest.mockResolvedValue({ status: 201, data: {} });
                const result = await offlineService.attemptSync();

                expect(result.success).toBe(1);
                expect(await offlineService.getPendingCount()).toBe(0);
            } finally {
                nowSpy.mockRestore();
                expect(Date.now()).toBeGreaterThanOrEqual(realNow);
            }
        });

        it('超過重試上限仍**不刪除**資料，只是跳過；retryFailed() 可重置', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });
            mockRequest.mockRejectedValue(httpError(500));
            setOnline(true);

            for (let i = 0; i < 6; i++) {
                await offlineService.attemptSync({ force: true });
            }

            const pending = await offlineService.getPendingChanges();
            expect(pending).toHaveLength(1); // 資料仍在
            expect(pending[0].retryCount).toBeGreaterThanOrEqual(5);

            // 到達上限後即使 force 也不再發請求
            const callsBefore = mockRequest.mock.calls.length;
            const result = await offlineService.attemptSync({ force: true });
            expect(mockRequest.mock.calls.length).toBe(callsBefore);
            expect(result.skipped).toBe(1);

            // retryFailed() 重置後可再次嘗試
            expect(await offlineService.retryFailed()).toBe(1);
            mockRequest.mockResolvedValue({ status: 201, data: {} });
            await offlineService.attemptSync({ force: true });
            expect(await offlineService.getPendingCount()).toBe(0);
        });
    });

    // ===================== 401 refresh 後重試 =====================

    describe('401 處理', () => {
        it('401 → refreshAccessToken() → 以新 token 重試 → 成功後清除', async () => {
            await offlineService.queueReport('ms-1', { title: 'x' });

            mockRequest
                .mockRejectedValueOnce(httpError(401))
                .mockResolvedValueOnce({ status: 201, data: {} });
            mockRefreshAccessToken.mockResolvedValue('fresh-token');

            setOnline(true);
            const result = await offlineService.attemptSync({ force: true });

            expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
            expect(mockRequest).toHaveBeenCalledTimes(2); // 原始 + refresh 後重試
            expect(result.success).toBe(1);
            expect(await offlineService.getPendingCount()).toBe(0);
        });

        it('401 且 refresh 失敗時**不丟棄**資料', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });

            mockRequest.mockRejectedValue(httpError(401));
            mockRefreshAccessToken.mockResolvedValue(null);

            setOnline(true);
            const result = await offlineService.attemptSync({ force: true });

            expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
            // refresh 失敗 → 不重試，直接保留
            expect(mockRequest).toHaveBeenCalledTimes(1);
            expect(result.failed).toBe(1);

            const pending = await offlineService.getPendingChanges();
            expect(pending).toHaveLength(1);
            expect(pending[0].retryCount).toBe(1);
        });

        it('refresh 後重試仍失敗時保留資料', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });

            mockRequest.mockRejectedValue(httpError(401));
            mockRefreshAccessToken.mockResolvedValue('fresh-token');

            setOnline(true);
            await offlineService.attemptSync({ force: true });

            expect(mockRequest).toHaveBeenCalledTimes(2);
            expect(await offlineService.getPendingCount()).toBe(1);
        });
    });

    // ===================== 成功後清除 =====================

    describe('重放成功後清除', () => {
        it('2xx 後項目從佇列移除，並更新 lastSyncAt', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });
            mockRequest.mockResolvedValue({ status: 201, data: { id: 'server-1' } });

            setOnline(true);
            const before = await offlineService.getLastSyncTime();
            const result = await offlineService.attemptSync({ force: true });

            expect(result).toMatchObject({ success: 1, failed: 0 });
            expect(await offlineService.getPendingCount()).toBe(0);

            const after = await offlineService.getLastSyncTime();
            expect(after).not.toBeNull();
            expect(after).not.toBe(before);
        });

        it('getStatus 回報同步後的 pendingChanges = 0', async () => {
            await offlineService.queueReport('ms-1', { title: '回報' });
            setOnline(true);
            await offlineService.attemptSync({ force: true });

            const status = await offlineService.getStatus();
            expect(status).toMatchObject({ pendingChanges: 0, isOnline: true, isSyncing: false });
        });

        it('同步狀態變更會通知訂閱者', async () => {
            const listener = vi.fn();
            const unsubscribe = offlineService.subscribe(listener);

            await offlineService.queueReport('ms-1', { title: '回報' });
            await vi.waitFor(() => expect(listener).toHaveBeenCalled());

            unsubscribe();
        });
    });

    // ===================== 收編自 offlineOutbox 的能力 =====================

    describe('清除快取不得波及未送出的 outbox', () => {
        it('clearCaches() 清掉唯讀快取，但保留 pendingSync', async () => {
            await offlineService.cacheAlerts([
                {
                    id: 'a1',
                    title: '警報',
                    description: '',
                    severity: 'critical',
                    createdAt: '2026-01-01T00:00:00Z',
                    source: 'ncdr',
                    cachedAt: 0,
                },
            ]);
            await offlineService.queueReport('ms-1', { title: '未送出的回報' });

            await offlineService.clearCaches();

            expect(await offlineService.getAlerts()).toHaveLength(0);
            // 關鍵：未送出的離線寫入必須還在
            expect(await offlineService.getPendingCount()).toBe(1);
        });
    });

    describe('報告離線快取（承接 offlineOutbox 的 reports-cache）', () => {
        it('cacheReports / getCachedReports 依 missionSessionId 取回', async () => {
            await offlineService.cacheReports([
                { id: 'rep-1', missionSessionId: 'ms-1', title: 'A' },
                { id: 'rep-2', missionSessionId: 'ms-2', title: 'B' },
                { id: 'rep-3', missionSessionId: 'ms-1', title: 'C' },
            ]);

            const ms1 = await offlineService.getCachedReports('ms-1');
            expect(ms1.map((r) => r.id).sort()).toEqual(['rep-1', 'rep-3']);
        });
    });
});
