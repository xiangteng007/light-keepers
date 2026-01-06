import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';

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
 * Google Cloud Storage Service for field reports attachments
 */
@Injectable()
export class GcsStorageService {
    private storage: Storage;
    private readonly defaultBucket: string;

    constructor(private configService: ConfigService) {
        // Initialize GCS client
        // In production, credentials come from GOOGLE_APPLICATION_CREDENTIALS
        // or from the service account attached to Cloud Run
        this.storage = new Storage();
        this.defaultBucket = this.configService.get<string>('GCS_BUCKET', 'lightkeepers-uploads');
    }

    /**
     * Generate a signed URL for uploading or downloading
     */
    async getSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult> {
        const {
            bucket = this.defaultBucket,
            path,
            contentType,
            action,
            expiresInMinutes = 15,
        } = options;

        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

        const [url] = await this.storage
            .bucket(bucket)
            .file(path)
            .getSignedUrl({
                version: 'v4',
                action: action === 'write' ? 'write' : 'read',
                expires: expiresAt,
                contentType: action === 'write' ? contentType : undefined,
            });

        return {
            url,
            method: action === 'write' ? 'PUT' : 'GET',
            expiresAt,
            bucket,
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
            bucket: this.defaultBucket,
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
            bucket: this.defaultBucket,
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
            bucket: this.defaultBucket,
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
            const [exists] = await this.storage
                .bucket(this.defaultBucket)
                .file(gcsPath)
                .exists();
            return exists;
        } catch {
            return false;
        }
    }

    /**
     * Delete a file
     */
    async deleteFile(gcsPath: string): Promise<boolean> {
        try {
            await this.storage
                .bucket(this.defaultBucket)
                .file(gcsPath)
                .delete();
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
            const [metadata] = await this.storage
                .bucket(this.defaultBucket)
                .file(gcsPath)
                .getMetadata();

            return {
                size: parseInt(metadata.size as string, 10),
                contentType: metadata.contentType || '',
                md5Hash: metadata.md5Hash,
                created: metadata.timeCreated ? new Date(metadata.timeCreated) : undefined,
            };
        } catch {
            return null;
        }
    }
}

export default GcsStorageService;
