/**
 * gcs-storage.provider.ts
 * 
 * P4: Storage Abstraction - Google Cloud Storage Implementation
 */
import { Injectable, Logger } from '@nestjs/common';
import { Storage, Bucket, File } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import {
    StorageProvider,
    StorageUploadResult,
    StorageDownloadResult,
    StorageListOptions,
    StorageListResult,
    StorageFileInfo,
    SignedUrlOptions,
} from './storage.interface';
import { Readable } from 'stream';

@Injectable()
export class GcsStorageProvider implements StorageProvider {
    private readonly logger = new Logger(GcsStorageProvider.name);
    private readonly storage: Storage;
    private readonly bucket: Bucket;
    private readonly publicUrl: string;

    constructor(private readonly configService: ConfigService) {
        const projectId = this.configService.get<string>('GCP_PROJECT_ID');
        const bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || 'default-bucket';
        const keyFilename = this.configService.get<string>('GCS_KEY_FILE');

        this.storage = new Storage({
            projectId,
            keyFilename,
        });

        this.bucket = this.storage.bucket(bucketName);
        this.publicUrl = `https://storage.googleapis.com/${bucketName}`;

        this.logger.log(`GCS Storage initialized - Bucket: ${bucketName}`);
    }

    async upload(
        path: string,
        data: Buffer | NodeJS.ReadableStream,
        options?: {
            contentType?: string;
            metadata?: Record<string, string>;
            public?: boolean;
        },
    ): Promise<StorageUploadResult> {
        const file = this.bucket.file(path);
        const stream = file.createWriteStream({
            resumable: false,
            contentType: options?.contentType || 'application/octet-stream',
            metadata: {
                metadata: options?.metadata,
            },
        });

        return new Promise((resolve, reject) => {
            if (Buffer.isBuffer(data)) {
                stream.end(data);
            } else {
                (data as Readable).pipe(stream);
            }

            stream.on('error', reject);
            stream.on('finish', async () => {
                if (options?.public) {
                    await file.makePublic();
                }

                const [metadata] = await file.getMetadata();
                resolve({
                    url: options?.public
                        ? `${this.publicUrl}/${path}`
                        : `gs://${this.bucket.name}/${path}`,
                    path,
                    size: Number(metadata.size) || 0,
                    contentType: metadata.contentType || 'application/octet-stream',
                    etag: metadata.etag,
                });
            });
        });
    }

    async download(path: string): Promise<StorageDownloadResult> {
        const file = this.bucket.file(path);
        const [data] = await file.download();
        const [metadata] = await file.getMetadata();

        return {
            data,
            contentType: metadata.contentType || 'application/octet-stream',
            size: data.length,
            lastModified: metadata.updated ? new Date(metadata.updated) : undefined,
        };
    }

    async delete(path: string): Promise<void> {
        const file = this.bucket.file(path);
        await file.delete({ ignoreNotFound: true });
    }

    async exists(path: string): Promise<boolean> {
        const file = this.bucket.file(path);
        const [exists] = await file.exists();
        return exists;
    }

    async getMetadata(path: string): Promise<StorageFileInfo> {
        const file = this.bucket.file(path);
        const [metadata] = await file.getMetadata();

        return {
            path,
            size: Number(metadata.size) || 0,
            contentType: metadata.contentType || 'application/octet-stream',
            lastModified: metadata.updated ? new Date(metadata.updated) : new Date(),
            etag: metadata.etag,
        };
    }

    async list(options?: StorageListOptions): Promise<StorageListResult> {
        const [files, , apiResponse] = await this.bucket.getFiles({
            prefix: options?.prefix,
            maxResults: options?.maxResults || 100,
            pageToken: options?.continuationToken,
        });

        return {
            files: files.map((file) => ({
                path: file.name,
                size: Number(file.metadata.size) || 0,
                contentType: file.metadata.contentType || 'application/octet-stream',
                lastModified: file.metadata.updated
                    ? new Date(file.metadata.updated)
                    : new Date(),
                etag: file.metadata.etag,
            })),
            nextContinuationToken: (apiResponse as any)?.nextPageToken,
            hasMore: !!(apiResponse as any)?.nextPageToken,
        };
    }

    async getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string> {
        const file = this.bucket.file(path);
        const action = options?.action === 'write' ? 'write' : 'read';

        const [url] = await file.getSignedUrl({
            action,
            expires: Date.now() + (options?.expiresIn || 3600) * 1000,
            contentType: options?.contentType,
        });

        return url;
    }

    async copy(sourcePath: string, destinationPath: string): Promise<StorageUploadResult> {
        const sourceFile = this.bucket.file(sourcePath);
        const destFile = this.bucket.file(destinationPath);

        await sourceFile.copy(destFile);
        const [metadata] = await destFile.getMetadata();

        return {
            url: `gs://${this.bucket.name}/${destinationPath}`,
            path: destinationPath,
            size: Number(metadata.size) || 0,
            contentType: metadata.contentType || 'application/octet-stream',
            etag: metadata.etag,
        };
    }

    async move(sourcePath: string, destinationPath: string): Promise<StorageUploadResult> {
        const result = await this.copy(sourcePath, destinationPath);
        await this.delete(sourcePath);
        return result;
    }
}
