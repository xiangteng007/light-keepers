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
    /** Base64 MD5 digest of the object (GCS `md5Hash` semantics) */
    md5Hash?: string;
    /** Creation time (GCS `timeCreated`; local: `birthtime`) */
    createdAt?: Date;
    /** Custom (user-defined) metadata attached at upload time */
    metadata?: Record<string, string>;
}

export interface SignedUrlOptions {
    expiresIn?: number;  // seconds, default 3600
    /**
     * Absolute expiry. Takes precedence over `expiresIn` when supplied — callers
     * that must report the same instant they signed for (e.g. an `expiresAt`
     * field in an API response) should pass this rather than `expiresIn`, so the
     * signature and the reported deadline cannot drift apart.
     */
    expiresAt?: Date;
    contentType?: string;
    action?: 'read' | 'write';
    /**
     * Signing scheme. GCS supports v2 (legacy) and v4; omitting it keeps the
     * SDK default. Callers that already pin a version must keep pinning it —
     * the emitted URL shape differs between the two.
     */
    version?: 'v2' | 'v4';
}

export interface StorageDeleteOptions {
    /**
     * When true (the default) deleting a missing object resolves quietly.
     * Callers that report "was there something to delete?" pass `false` and
     * catch the resulting error.
     */
    ignoreNotFound?: boolean;
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
    delete(path: string, options?: StorageDeleteOptions): Promise<void>;

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
     * The unsigned, publicly reachable URL for an object.
     *
     * GCS returns the `storage.googleapis.com/<bucket>/<path>` form; the local
     * driver returns the `LOCAL_STORAGE_URL` form that nginx serves from its
     * `/uploads/` location. Callers use it both to persist a browsable URL and
     * to map such a URL back to a storage path (strip `getPublicUrl('')`).
     */
    getPublicUrl(path: string): string;

    /**
     * Identifier of the backing container — the GCS bucket name, or the local
     * storage root. Informational only; never part of a path.
     */
    getContainerName(): string;

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

/**
 * Describes a per-feature storage binding.
 *
 * Before the abstraction was wired up, each file-handling service opened its
 * own GCS client against its own bucket (`GCS_BUCKET`, `GCS_BUCKET_NAME`,
 * `GCS_MAP_PACKAGES_BUCKET`). Those are three genuinely different buckets, so a
 * single shared provider would silently relocate objects in GCS mode. Features
 * therefore keep their own bucket binding via `StorageModule.forFeature()`.
 *
 * In local mode every feature shares one root: the NAS deployment serves a
 * single `/uploads/` tree through nginx, and the object paths are already
 * namespaced (`reports/…`, `packages/…`).
 */
export interface StorageFeatureOptions {
    /** DI token published by the feature module */
    token: symbol | string;
    /** Env key holding the GCS bucket name for this feature */
    bucketEnvKey: string;
    /** Bucket used when the env key is unset — preserves each service's legacy default */
    defaultBucket: string;
}
