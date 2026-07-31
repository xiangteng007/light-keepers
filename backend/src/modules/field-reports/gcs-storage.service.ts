import { Inject, Injectable } from '@nestjs/common';
import { FIELD_REPORT_STORAGE } from '../../common/storage/storage.tokens';
import type { StorageProvider } from '../../common/storage/storage.interface';

export interface SignedUrlOptions {
    bucket: string;
    path: string;
    contentType: string;
    action: 'read' | 'write';
    expiresInMinutes?: number;
}

export interface SignedUrlResult {
    url: string;
    method: string;
    expiresAt: Date;
    bucket: string;
    path: string;
}

/**
 * Storage service for field-report attachments.
 *
 * INF-1 / M.3b: routes through the `STORAGE_PROVIDER` abstraction instead of
 * the GCS SDK, so `STORAGE_PROVIDER=local` keeps attachments working after the
 * cloud project is shut down. In GCS mode the emitted URLs are unchanged:
 * still v4 signatures over the same `reports/<session>/<report>/<attachment>`
 * paths in the `GCS_BUCKET` bucket.
 */
@Injectable()
export class GcsStorageService {
    constructor(
        @Inject(FIELD_REPORT_STORAGE) private readonly storage: StorageProvider,
    ) { }

    /**
     * Generate a signed URL for uploading or downloading
     */
    async getSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult> {
        const { path, contentType, action, expiresInMinutes = 15 } = options;

        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

        const url = await this.storage.getSignedUrl(path, {
            version: 'v4',
            action,
            expiresAt,
            // Only write URLs bind a content type — a read URL that pins one
            // would reject clients that omit the header.
            contentType: action === 'write' ? contentType : undefined,
        });

        return {
            url,
            method: action === 'write' ? 'PUT' : 'GET',
            expiresAt,
            bucket: this.storage.getContainerName(),
            path,
        };
    }

    /**
     * Generate upload signed URL for a report attachment
     */
    async generateUploadUrl(
        missionSessionId: string,
        reportId: string,
        attachmentId: string,
        contentType: string,
    ): Promise<SignedUrlResult> {
        const path = `reports/${missionSessionId}/${reportId}/${attachmentId}`;
        return this.getSignedUrl({
            bucket: this.storage.getContainerName(),
            path,
            contentType,
            action: 'write',
            expiresInMinutes: 15,
        });
    }

    /**
     * Generate download signed URL for viewing an attachment
     */
    async generateDownloadUrl(gcsPath: string): Promise<SignedUrlResult> {
        return this.getSignedUrl({
            bucket: this.storage.getContainerName(),
            path: gcsPath,
            contentType: 'application/octet-stream',
            action: 'read',
            expiresInMinutes: 60,
        });
    }

    /**
     * Generate thumbnail upload URL
     */
    async generateThumbnailUploadUrl(gcsPath: string): Promise<SignedUrlResult> {
        const thumbnailPath = gcsPath.replace(/(\.[^.]+)$/, '_thumb.webp');
        return this.getSignedUrl({
            bucket: this.storage.getContainerName(),
            path: thumbnailPath,
            contentType: 'image/webp',
            action: 'write',
            expiresInMinutes: 10,
        });
    }

    /**
     * Check if a file exists
     */
    async fileExists(gcsPath: string): Promise<boolean> {
        try {
            return await this.storage.exists(gcsPath);
        } catch {
            return false;
        }
    }

    /**
     * Delete a file. Returns false when there was nothing to delete, matching
     * the pre-abstraction behaviour (GCS `file.delete()` threw a 404).
     */
    async deleteFile(gcsPath: string): Promise<boolean> {
        try {
            await this.storage.delete(gcsPath, { ignoreNotFound: false });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file metadata
     */
    async getFileMetadata(gcsPath: string): Promise<{
        size: number;
        contentType: string;
        md5Hash?: string;
        created?: Date;
    } | null> {
        try {
            const info = await this.storage.getMetadata(gcsPath);

            return {
                size: info.size,
                contentType: info.contentType || '',
                md5Hash: info.md5Hash,
                created: info.createdAt,
            };
        } catch {
            return null;
        }
    }
}

export default GcsStorageService;
