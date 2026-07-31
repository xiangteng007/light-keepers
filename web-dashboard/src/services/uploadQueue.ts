/**
 * Upload Queue — presigned URL 附件上傳（照片 / 影片）
 *
 * FE-4 / 工作項 3.4 修復內容：
 *  - 路徑補上 `/api/v1`（改用 `src/api/config.ts` 的 `API_BASE`），原本 production 必 404
 *  - token 改為**每次請求即時讀取** `getStoredToken()`，不再依賴呼叫端 `setToken()`
 *    快照下來的舊 token（離線越久越必然 401）
 *  - 401 → `refreshAccessToken()` → 重試一次
 *  - 移除對 `offlineOutbox` 的相依：原本每個 attachment 項目入列後，
 *    `offlineOutbox.syncItem()` 對 `'attachment'` 一律 `throw`，
 *    導致這些項目永遠重試失敗、永遠清不掉
 *
 * ## 為什麼不併進 offline.service 的 outbox
 *
 * outbox 儲存的是可序列化的 JSON 寫入；本佇列持有 `File`/`Blob`，且需要
 * `XMLHttpRequest` 的上傳進度事件與對 GCS presigned URL 的**直傳**
 * （不能經過 axios baseURL）。兩者語意不同，見
 * `docs/architecture/OFFLINE_LAYER_CONSOLIDATION.md` §3.2。
 *
 * ## 已知限制
 *
 * 佇列是記憶體 `Map`，重新整理分頁後未完成的上傳會遺失。要做到耐久需把 `Blob`
 * 存進 IndexedDB，屬於獨立工作項（見該文件 §6）。
 */

import { API_BASE } from '../api/config';
import { getStoredToken, refreshAccessToken } from '../api/client';

interface UploadTask {
    id: string;
    reportId: string;
    missionSessionId: string;
    file: File | Blob;
    mime: string;
    uploadUrl?: string;
    attachmentId?: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    retryCount: number;
    createdAt: string;
    error?: string;
}

interface UploadQueueCallbacks {
    onProgress?: (taskId: string, progress: number) => void;
    onComplete?: (taskId: string, attachmentId: string) => void;
    onError?: (taskId: string, error: string) => void;
}

/**
 * 對應後端 `InitiateUploadDto`（`backend/src/modules/field-reports/dto/attachment.dto.ts`）。
 * 後端 ValidationPipe 開了 `forbidNonWhitelisted`，多送欄位會 400，因此這裡的欄位必須精確。
 */
interface UploadMetadata {
    kind: 'photo' | 'video' | 'file';
    sha256?: string;
    originalFilename?: string;
    capturedAt?: string;
    photoLatitude?: number;
    photoLongitude?: number;
    photoAccuracyM?: number;
    locationSource: 'exif' | 'device' | 'manual' | 'unknown';
    showOnMap?: boolean;
}

class UploadQueueService {
    private queue: Map<string, UploadTask> = new Map();
    private metadata: Map<string, UploadMetadata> = new Map();
    private activeUploads = 0;
    private readonly maxConcurrent = 2;
    private callbacks: UploadQueueCallbacks = {};

    /**
     * 發出帶 Bearer 的 API 請求；401 時先 refresh 再重試一次。
     *
     * 這裡不能直接用 `src/api/client.ts` 的 axios instance，因為 initiate/complete
     * 之間夾著對 GCS presigned URL 的直傳（見檔頭說明），統一用同一套 fetch
     * 包裝比較不會讓認證語意分裂。token 一律**當下讀取**，不做快照。
     */
    private async authedFetch(path: string, body: unknown): Promise<Response> {
        const send = (token: string | null) =>
            fetch(`${API_BASE}${path}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify(body),
            });

        let response = await send(getStoredToken());

        if (response.status === 401) {
            const newToken = await refreshAccessToken();
            if (newToken) {
                response = await send(newToken);
            }
        }

        return response;
    }

    /**
     * Set event callbacks
     */
    setCallbacks(callbacks: UploadQueueCallbacks): void {
        this.callbacks = callbacks;
    }

    /**
     * Add a file to the upload queue
     */
    async addToQueue(
        reportId: string,
        missionSessionId: string,
        file: File | Blob,
        mime: string,
        metadata: UploadMetadata,
    ): Promise<string> {
        const taskId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        const task: UploadTask = {
            id: taskId,
            reportId,
            missionSessionId,
            file,
            mime,
            progress: 0,
            status: 'pending',
            retryCount: 0,
            createdAt: new Date().toISOString(),
        };

        this.queue.set(taskId, task);
        this.metadata.set(taskId, metadata);

        // Start processing
        this.processQueue();

        return taskId;
    }

    /**
     * Process the upload queue
     */
    private async processQueue(): Promise<void> {
        if (this.activeUploads >= this.maxConcurrent) return;
        if (!navigator.onLine) return;

        // Find next pending task
        const pendingTask = Array.from(this.queue.values())
            .find(t => t.status === 'pending');

        if (!pendingTask) return;

        this.activeUploads++;
        pendingTask.status = 'uploading';

        try {
            await this.uploadFile(pendingTask);
            pendingTask.status = 'completed';
            this.callbacks.onComplete?.(pendingTask.id, pendingTask.attachmentId!);
        } catch (error) {
            pendingTask.retryCount++;
            pendingTask.error = error instanceof Error ? error.message : 'Upload failed';

            if (pendingTask.retryCount >= 3) {
                pendingTask.status = 'failed';
                this.callbacks.onError?.(pendingTask.id, pendingTask.error);
            } else {
                pendingTask.status = 'pending';
                // Exponential backoff
                setTimeout(() => this.processQueue(), 1000 * Math.pow(2, pendingTask.retryCount));
            }
        } finally {
            this.activeUploads--;
            this.processQueue(); // Process next
        }
    }

    /**
     * Upload a file to GCS via signed URL
     */
    private async uploadFile(task: UploadTask): Promise<void> {
        // Step 1: Get signed URL
        // 帶上呼叫端提供的 metadata（原本硬寫 kind:'photo' / locationSource:'device'，
        // 等於丟掉 EXIF 座標與 video/file 類型）
        const meta = this.metadata.get(task.id);
        const initiateRes = await this.authedFetch(
            `/reports/${task.reportId}/attachments/initiate`,
            {
                ...meta,
                kind: meta?.kind ?? 'photo',
                locationSource: meta?.locationSource ?? 'unknown',
                mime: task.mime,
                size: task.file.size,
            },
        );

        if (!initiateRes.ok) {
            throw new Error(`Failed to initiate upload: ${initiateRes.status}`);
        }

        const { attachmentId, uploadUrl } = await initiateRes.json();
        task.attachmentId = attachmentId;
        task.uploadUrl = uploadUrl;

        // Step 2: Upload to GCS
        await this.uploadWithProgress(task.file, uploadUrl, task.mime, (progress) => {
            task.progress = progress;
            this.callbacks.onProgress?.(task.id, progress);
        });

        // Step 3: Complete upload
        const completeRes = await this.authedFetch(
            `/reports/${task.reportId}/attachments/${attachmentId}/complete`,
            { success: true, finalSize: task.file.size },
        );

        if (!completeRes.ok) {
            throw new Error(`Failed to complete upload: ${completeRes.status}`);
        }

        this.metadata.delete(task.id);
    }

    /**
     * Upload with progress tracking
     */
    private uploadWithProgress(
        file: File | Blob,
        url: string,
        mime: string,
        onProgress: (progress: number) => void,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error')));
            xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

            xhr.open('PUT', url);
            xhr.setRequestHeader('Content-Type', mime);
            xhr.send(file);
        });
    }

    /**
     * Get queue status
     */
    getStatus(): {
        pending: number;
        uploading: number;
        completed: number;
        failed: number;
        tasks: UploadTask[];
    } {
        const tasks = Array.from(this.queue.values());
        return {
            pending: tasks.filter(t => t.status === 'pending').length,
            uploading: tasks.filter(t => t.status === 'uploading').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length,
            tasks,
        };
    }

    /**
     * Retry a failed upload
     */
    retryUpload(taskId: string): void {
        const task = this.queue.get(taskId);
        if (task && task.status === 'failed') {
            task.status = 'pending';
            task.retryCount = 0;
            this.processQueue();
        }
    }

    /**
     * Cancel an upload
     */
    cancelUpload(taskId: string): void {
        this.queue.delete(taskId);
        this.metadata.delete(taskId);
    }

    /**
     * Clear completed uploads
     */
    clearCompleted(): void {
        for (const [id, task] of this.queue) {
            if (task.status === 'completed') {
                this.queue.delete(id);
                this.metadata.delete(id);
            }
        }
    }
}

// Export singleton instance
export const uploadQueue = new UploadQueueService();
export default uploadQueue;
