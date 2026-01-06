/**
 * Upload Queue for Capacitor Field Worker App
 * Manages photo/video uploads with retry and resumable support
 */

import { offlineOutbox } from './offlineOutbox';

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

class UploadQueueService {
    private queue: Map<string, UploadTask> = new Map();
    private activeUploads = 0;
    private readonly maxConcurrent = 2;
    private callbacks: UploadQueueCallbacks = {};
    private token: string = '';

    /**
     * Set authentication token
     */
    setToken(token: string): void {
        this.token = token;
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
        metadata: {
            kind: 'photo' | 'video' | 'file';
            sha256?: string;
            originalFilename?: string;
            capturedAt?: string;
            photoLatitude?: number;
            photoLongitude?: number;
            photoAccuracyM?: number;
            locationSource: 'exif' | 'device' | 'manual' | 'unknown';
            showOnMap?: boolean;
        },
    ): Promise<string> {
        const taskId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

        // Store metadata in outbox for offline support
        await offlineOutbox.addToOutbox('attachment', {
            taskId,
            reportId,
            missionSessionId,
            metadata,
            token: this.token,
        });

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
        const apiUrl = import.meta.env.VITE_API_URL || '';

        // Step 1: Get signed URL
        const initiateRes = await fetch(`${apiUrl}/reports/${task.reportId}/attachments/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({
                kind: 'photo',
                mime: task.mime,
                size: task.file.size,
                locationSource: 'device',
            }),
        });

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
        const completeRes = await fetch(`${apiUrl}/reports/${task.reportId}/attachments/${attachmentId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({ success: true }),
        });

        if (!completeRes.ok) {
            throw new Error(`Failed to complete upload: ${completeRes.status}`);
        }
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
    }

    /**
     * Clear completed uploads
     */
    clearCompleted(): void {
        for (const [id, task] of this.queue) {
            if (task.status === 'completed') {
                this.queue.delete(id);
            }
        }
    }
}

// Export singleton instance
export const uploadQueue = new UploadQueueService();
export default uploadQueue;
