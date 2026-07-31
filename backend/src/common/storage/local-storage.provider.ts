/**
 * local-storage.provider.ts
 * 
 * P4: Storage Abstraction - Local File System Implementation
 * For development and testing environments
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

        // INF-1: the base directory is a bind-mounted NAS volume. If the mount is
        // missing or not writable the failure must be visible at boot, not surface
        // as an unhandled rejection on the first upload hours later.
        this.ensureDirectoryExists(this.basePath).catch((error) => {
            this.logger.error(
                `Failed to create local storage base directory "${this.basePath}". ` +
                `Uploads will fail until this is fixed (check volume mount and permissions).`,
                error instanceof Error ? error.stack : String(error),
            );
        });
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Resolve a caller-supplied path against the storage root.
     *
     * SAFETY INVARIANT: the result must stay inside `basePath`.
     * `path.join(base, '../../etc/passwd')` happily escapes the root, so every
     * path coming from a caller (and therefore potentially from a request body,
     * a filename, or a DB column) is resolved and re-checked here. On the NAS
     * deployment the root is a real filesystem mount, so an escape is arbitrary
     * read/write on the host — this check is the only thing preventing it.
     */
    private getFullPath(filePath: string): string {
        const root = path.resolve(this.basePath);
        const resolved = path.resolve(root, filePath);

        if (resolved !== root && !resolved.startsWith(root + path.sep)) {
            throw new BadRequestException(`Invalid storage path: ${filePath}`);
        }

        return resolved;
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
        // getFullPath returns an absolute path, so the root used for the
        // relative-path calculation below must be absolute too.
        const root = path.resolve(this.basePath);
        const searchPath = options?.prefix
            ? this.getFullPath(options.prefix)
            : root;

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
            await walkDir(searchPath, root);
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
