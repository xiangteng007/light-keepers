/**
 * storage.interface.ts
 * 
 * P4: Storage Abstraction - Unified Storage Interface
 * 
 * Provides a consistent API for file operations across different
 * storage providers (GCS, S3, Azure Blob, Local)
 */

export interface StorageUploadResult {
    url: string;
    path: string;
    size: number;
    contentType: string;
    etag?: string;
    metadata?: Record<string, string>;
}

export interface StorageDownloadResult {
    data: Buffer;
    contentType: string;
    size: number;
    lastModified?: Date;
}

export interface StorageListOptions {
    prefix?: string;
    maxResults?: number;
    continuationToken?: string;
}

export interface StorageListResult {
    files: StorageFileInfo[];
    nextContinuationToken?: string;
    hasMore: boolean;
}

export interface StorageFileInfo {
    path: string;
    size: number;
    contentType: string;
    lastModified: Date;
    etag?: string;
}

export interface SignedUrlOptions {
    expiresIn?: number;  // seconds, default 3600
    contentType?: string;
    action?: 'read' | 'write';
}

export interface StorageProvider {
    /**
     * Upload a file to storage
     */
    upload(
        path: string,
        data: Buffer | NodeJS.ReadableStream,
        options?: {
            contentType?: string;
            metadata?: Record<string, string>;
            public?: boolean;
        },
    ): Promise<StorageUploadResult>;

    /**
     * Download a file from storage
     */
    download(path: string): Promise<StorageDownloadResult>;

    /**
     * Delete a file from storage
     */
    delete(path: string): Promise<void>;

    /**
     * Check if a file exists
     */
    exists(path: string): Promise<boolean>;

    /**
     * Get file metadata without downloading
     */
    getMetadata(path: string): Promise<StorageFileInfo>;

    /**
     * List files in a directory/prefix
     */
    list(options?: StorageListOptions): Promise<StorageListResult>;

    /**
     * Generate a signed URL for temporary access
     */
    getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string>;

    /**
     * Copy a file to a new location
     */
    copy(sourcePath: string, destinationPath: string): Promise<StorageUploadResult>;

    /**
     * Move a file to a new location
     */
    move(sourcePath: string, destinationPath: string): Promise<StorageUploadResult>;
}

export interface StorageConfig {
    provider: 'gcs' | 's3' | 'azure' | 'local';
    bucket?: string;
    region?: string;
    publicUrl?: string;
    credentials?: {
        projectId?: string;
        keyFilename?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
    };
    localPath?: string;  // For local provider
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
