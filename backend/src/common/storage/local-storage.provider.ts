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
import { createWriteStream } from 'fs';
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
    StorageDeleteOptions,
} from './storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
    private readonly logger = new Logger(LocalStorageProvider.name);
    private readonly basePath: string;
    private readonly publicUrl: string;
    private readonly signingSecret?: string;
    private readonly uploadEndpoint: string;

    constructor(private readonly configService: ConfigService) {
        this.basePath = this.configService.get<string>('LOCAL_STORAGE_PATH') || './uploads';
        this.publicUrl = this.configService.get<string>('LOCAL_STORAGE_URL') || 'http://localhost:3000/uploads';
        this.signingSecret = this.configService.get<string>('LOCAL_STORAGE_SIGNING_SECRET') || undefined;
        // O21：write 簽名 URL 的落地端點（backend PUT /api/v1/uploads/*）。
        // 預設由 BASE_URL 推導；read URL 仍走 LOCAL_STORAGE_URL（nginx 靜態出檔）。
        const apiBase =
            this.configService.get<string>('LOCAL_STORAGE_UPLOAD_URL') ||
            `${(this.configService.get<string>('BASE_URL') || 'http://localhost:3000').replace(/\/$/, '')}/api/v1/uploads`;
        this.uploadEndpoint = apiBase.replace(/\/$/, '');

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

    async delete(filePath: string, options?: StorageDeleteOptions): Promise<void> {
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
            const missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
            if (!missing || options?.ignoreNotFound === false) {
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
        const digest = crypto.createHash('md5').update(await fs.readFile(fullPath));

        return {
            path: filePath,
            size: stats.size,
            contentType: this.getMimeType(filePath),
            lastModified: stats.mtime,
            etag: digest.copy().digest('hex'),
            // GCS reports md5 base64-encoded; match that so callers can compare
            // the two backends without knowing which one answered.
            md5Hash: digest.copy().digest('base64'),
            createdAt: stats.birthtime,
            metadata: await this.readSidecarMetadata(fullPath),
        };
    }

    private async readSidecarMetadata(fullPath: string): Promise<Record<string, string> | undefined> {
        try {
            const raw = await fs.readFile(`${fullPath}.meta.json`, 'utf8');
            return JSON.parse(raw) as Record<string, string>;
        } catch {
            return undefined;
        }
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

    /**
     * Local "signed" URL — the nginx `/uploads/` direct-serve path.
     *
     * The NAS deployment serves this tree with a plain `alias` +
     * `try_files $uri =404` (infra/nas/nginx/default.conf), i.e. no
     * `auth_request` and no `secure_link`. So the only URL shape that actually
     * resolves today is `LOCAL_STORAGE_URL/<path>` — that is what this returns,
     * and it matches the GCS public-object behaviour the platform had before
     * the migration (infra/nas/README.md §7.2-2).
     *
     * When `LOCAL_STORAGE_SIGNING_SECRET` is set the URL additionally carries
     * `?expires=<unix>&signature=<hmac>`. nginx matches on `$uri`, which
     * excludes the query string, so the file still serves unchanged — but the
     * URL is then ready for the `auth_request` step tracked in README §8:
     * turning enforcement on becomes an nginx-side change with no new URL
     * format for clients. `verifySignedUrl()` is that endpoint's counterpart.
     */
    async getSignedUrl(filePath: string, options?: SignedUrlOptions): Promise<string> {
        // Reachable from request data now that services inject this provider:
        // reject traversal before it can be handed out as a URL.
        this.getFullPath(filePath);

        const action = options?.action === 'write' ? 'write' : 'read';

        if (action === 'write') {
            // O21：write URL 一律指向 backend 落地端點（nginx /uploads/ 不收 PUT）。
            // 無簽章密鑰＝簽不出可驗證的 capability URL，直接拒發（fail loud，
            // 不再回傳一個必然 405 的 nginx URL 假裝成功）。
            if (!this.signingSecret) {
                throw new Error(
                    'LOCAL_STORAGE_SIGNING_SECRET is required to issue write signed URLs ' +
                    'in local storage mode (see infra/nas/README.md §7.2-2 / O21)',
                );
            }
            const expiresAt =
                options?.expiresAt ?? new Date(Date.now() + (options?.expiresIn || 3600) * 1000);
            const expires = Math.floor(expiresAt.getTime() / 1000);
            const signature = this.sign(filePath, action, expires);
            return `${this.uploadEndpoint}/${filePath}?action=write&expires=${expires}&signature=${signature}`;
        }

        const base = `${this.publicUrl}/${filePath}`;
        if (!this.signingSecret) {
            return base;
        }

        const expiresAt =
            options?.expiresAt ?? new Date(Date.now() + (options?.expiresIn || 3600) * 1000);
        const expires = Math.floor(expiresAt.getTime() / 1000);
        const signature = this.sign(filePath, action, expires);

        return `${base}?action=${action}&expires=${expires}&signature=${signature}`;
    }

    /**
     * Validate a URL previously produced by `getSignedUrl()`.
     * Returns false for an unknown path, a bad signature, or an expired token.
     */
    verifySignedUrl(url: string, now: Date = new Date()): boolean {
        if (!this.signingSecret) {
            // Nothing was signed, so nothing can be verified.
            return false;
        }

        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            return false;
        }

        const readPrefix = new URL(`${this.publicUrl}/`);
        const writePrefix = new URL(`${this.uploadEndpoint}/`);
        let prefix: URL;
        if (parsed.origin === readPrefix.origin && parsed.pathname.startsWith(readPrefix.pathname)) {
            prefix = readPrefix;
        } else if (parsed.origin === writePrefix.origin && parsed.pathname.startsWith(writePrefix.pathname)) {
            prefix = writePrefix;
        } else {
            return false;
        }

        const filePath = decodeURIComponent(parsed.pathname.slice(prefix.pathname.length));
        const expires = Number(parsed.searchParams.get('expires'));
        const signature = parsed.searchParams.get('signature') ?? '';
        const action = parsed.searchParams.get('action') === 'write' ? 'write' : 'read';

        if (!Number.isFinite(expires) || expires * 1000 <= now.getTime()) {
            return false;
        }

        return this.verifySignature(filePath, action, expires, signature);
    }

    /**
     * O21：落地端點用的成分驗證（不重組 URL）。
     * 簽章繫結 action:path:expires；timingSafeEqual 防 timing 攻擊。
     */
    verifySignature(
        filePath: string,
        action: 'read' | 'write',
        expires: number,
        signature: string,
        now: Date = new Date(),
    ): boolean {
        if (!this.signingSecret || !signature) {
            return false;
        }
        if (!Number.isFinite(expires) || expires * 1000 <= now.getTime()) {
            return false;
        }
        try {
            this.getFullPath(filePath); // 路徑穿越擋在驗章前
        } catch {
            return false;
        }
        const expected = this.sign(filePath, action, expires);
        const given = Buffer.from(signature);
        const want = Buffer.from(expected);
        return given.length === want.length && crypto.timingSafeEqual(given, want);
    }

    private sign(filePath: string, action: string, expires: number): string {
        return crypto
            .createHmac('sha256', this.signingSecret as string)
            .update(`${action}:${filePath}:${expires}`)
            .digest('hex');
    }

    getPublicUrl(filePath: string): string {
        if (filePath) {
            this.getFullPath(filePath);
        }
        return `${this.publicUrl}/${filePath}`;
    }

    getContainerName(): string {
        return this.basePath;
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
