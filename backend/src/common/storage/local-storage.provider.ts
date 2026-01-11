/**
 * local-storage.provider.ts
 * 
 * P4: Storage Abstraction - Local File System Implementation
 * For development and testing environments
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import * as crypto from 'crypto';
import {
    StorageProvider,
    StorageUploadResult,
    StorageDownloadResult,
    StorageListOptions,
    StorageListResult,
    StorageFileInfo,
    SignedUrlOptions,
} from './storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
    private readonly logger = new Logger(LocalStorageProvider.name);
    private readonly basePath: string;
    private readonly publicUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.basePath = this.configService.get<string>('LOCAL_STORAGE_PATH') || './uploads';
        this.publicUrl = this.configService.get<string>('LOCAL_STORAGE_URL') || 'http://localhost:3000/uploads';

        this.logger.log(`Local Storage initialized - Path: ${this.basePath}`);
        this.ensureDirectoryExists(this.basePath);
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    private getFullPath(filePath: string): string {
        return path.join(this.basePath, filePath);
    }

    private getMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    async upload(
        filePath: string,
        data: Buffer | NodeJS.ReadableStream,
        options?: {
            contentType?: string;
            metadata?: Record<string, string>;
            public?: boolean;
        },
    ): Promise<StorageUploadResult> {
        const fullPath = this.getFullPath(filePath);
        const dirPath = path.dirname(fullPath);

        await this.ensureDirectoryExists(dirPath);

        if (Buffer.isBuffer(data)) {
            await fs.writeFile(fullPath, data);
        } else {
            await pipeline(data as Readable, createWriteStream(fullPath));
        }

        const stats = await fs.stat(fullPath);
        const contentType = options?.contentType || this.getMimeType(filePath);

        // Store metadata in a sidecar file
        if (options?.metadata) {
            const metaPath = `${fullPath}.meta.json`;
            await fs.writeFile(metaPath, JSON.stringify(options.metadata));
        }

        return {
            url: `${this.publicUrl}/${filePath}`,
            path: filePath,
            size: stats.size,
            contentType,
            etag: crypto.createHash('md5').update(await fs.readFile(fullPath)).digest('hex'),
        };
    }

    async download(filePath: string): Promise<StorageDownloadResult> {
        const fullPath = this.getFullPath(filePath);
        const data = await fs.readFile(fullPath);
        const stats = await fs.stat(fullPath);

        return {
            data,
            contentType: this.getMimeType(filePath),
            size: stats.size,
            lastModified: stats.mtime,
        };
    }

    async delete(filePath: string): Promise<void> {
        const fullPath = this.getFullPath(filePath);
        try {
            await fs.unlink(fullPath);
            // Also delete metadata file if exists
            const metaPath = `${fullPath}.meta.json`;
            try {
                await fs.unlink(metaPath);
            } catch {
                // Ignore if metadata file doesn't exist
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
    }

    async exists(filePath: string): Promise<boolean> {
        const fullPath = this.getFullPath(filePath);
        try {
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    async getMetadata(filePath: string): Promise<StorageFileInfo> {
        const fullPath = this.getFullPath(filePath);
        const stats = await fs.stat(fullPath);

        return {
            path: filePath,
            size: stats.size,
            contentType: this.getMimeType(filePath),
            lastModified: stats.mtime,
            etag: crypto.createHash('md5').update(await fs.readFile(fullPath)).digest('hex'),
        };
    }

    async list(options?: StorageListOptions): Promise<StorageListResult> {
        const searchPath = options?.prefix
            ? this.getFullPath(options.prefix)
            : this.basePath;

        const files: StorageFileInfo[] = [];

        async function walkDir(dir: string, basePath: string): Promise<void> {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await walkDir(fullPath, basePath);
                } else if (!entry.name.endsWith('.meta.json')) {
                    const stats = await fs.stat(fullPath);
                    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');
                    files.push({
                        path: relativePath,
                        size: stats.size,
                        contentType: 'application/octet-stream',
                        lastModified: stats.mtime,
                    });
                }
            }
        }

        try {
            await walkDir(searchPath, this.basePath);
        } catch {
            // Directory doesn't exist
        }

        const maxResults = options?.maxResults || 100;
        const limited = files.slice(0, maxResults);

        return {
            files: limited,
            hasMore: files.length > maxResults,
            nextContinuationToken: files.length > maxResults ? String(maxResults) : undefined,
        };
    }

    async getSignedUrl(filePath: string, options?: SignedUrlOptions): Promise<string> {
        // Local storage doesn't support signed URLs, return direct URL
        // In production, implement JWT-based access tokens
        return `${this.publicUrl}/${filePath}`;
    }

    async copy(sourcePath: string, destinationPath: string): Promise<StorageUploadResult> {
        const sourceFullPath = this.getFullPath(sourcePath);
        const destFullPath = this.getFullPath(destinationPath);

        await this.ensureDirectoryExists(path.dirname(destFullPath));
        await fs.copyFile(sourceFullPath, destFullPath);

        const stats = await fs.stat(destFullPath);

        return {
            url: `${this.publicUrl}/${destinationPath}`,
            path: destinationPath,
            size: stats.size,
            contentType: this.getMimeType(destinationPath),
        };
    }

    async move(sourcePath: string, destinationPath: string): Promise<StorageUploadResult> {
        const result = await this.copy(sourcePath, destinationPath);
        await this.delete(sourcePath);
        return result;
    }
}
