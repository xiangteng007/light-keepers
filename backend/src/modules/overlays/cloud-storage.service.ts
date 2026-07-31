/**
 * Storage integration for Map Package distribution
 *
 * INF-1 / M.3b：原本直接使用 GCS SDK 主機離線後即失效。改為注入
 * `MAP_PACKAGE_STORAGE`（`STORAGE_PROVIDER` 的 feature 綁定）。GCS 模式下仍寫入
 * `GCS_MAP_PACKAGES_BUCKET`，`packages/<id>.<ext>` 路徑與公開 URL 皆不變。
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { MapPackage } from './entities/map-package.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MAP_PACKAGE_STORAGE } from '../../common/storage/storage.tokens';
import type { StorageProvider } from '../../common/storage/storage.interface';

/**
 * `list()` has no "give me everything" mode, and the previous implementation
 * called `bucket.getFiles()` unbounded. Map packages are basemap/style bundles
 * for a handful of regions, so one generous page covers the real inventory.
 */
const PACKAGE_LIST_LIMIT = 1000;

@Injectable()
export class CloudStorageService {
    private readonly logger = new Logger(CloudStorageService.name);

    constructor(
        @Inject(MAP_PACKAGE_STORAGE) private readonly storage: StorageProvider,
        @InjectRepository(MapPackage)
        private packageRepo: Repository<MapPackage>,
    ) { }

    /**
     * Check if storage is available.
     *
     * 抽象層一定會提供一個 provider（GCS 或本地磁碟），因此恆為 true。
     */
    isAvailable(): boolean {
        return true;
    }

    /**
     * Generate a signed URL for downloading a package
     * Valid for 1 hour
     */
    async getSignedDownloadUrl(packageId: string): Promise<string | null> {
        const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
        if (!pkg) {
            throw new Error(`Package not found: ${packageId}`);
        }

        const fileName = this.getStorageFileName(pkg);

        if (!(await this.storage.exists(fileName))) {
            this.logger.warn(`Package file not found in storage: ${fileName}`);
            return null;
        }

        return this.storage.getSignedUrl(fileName, {
            action: 'read',
            expiresIn: 60 * 60, // 1 hour
        });
    }

    /**
     * Upload a package to storage
     */
    async uploadPackage(
        packageId: string,
        buffer: Buffer,
        contentType: string = 'application/octet-stream'
    ): Promise<{ url: string; size: number }> {
        const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
        if (!pkg) {
            throw new Error(`Package not found: ${packageId}`);
        }

        const fileName = this.getStorageFileName(pkg);

        await this.storage.upload(fileName, buffer, {
            contentType,
            metadata: {
                packageId: pkg.id,
                version: pkg.version,
                type: pkg.type,
            },
        });

        // Update package record with storage URL
        const publicUrl = this.storage.getPublicUrl(fileName);
        await this.packageRepo.update(packageId, {
            fileUrl: publicUrl,
            fileSize: buffer.length,
        });

        this.logger.log(`Uploaded package ${pkg.name} to ${publicUrl}`);

        return {
            url: publicUrl,
            size: buffer.length
        };
    }

    /**
     * Delete a package from storage
     */
    async deletePackage(packageId: string): Promise<void> {
        const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
        if (!pkg) return;

        const fileName = this.getStorageFileName(pkg);

        // A package whose file is already gone is not an error — the previous
        // implementation swallowed the GCS 404 for the same reason.
        await this.storage.delete(fileName);
        this.logger.log(`Deleted package file: ${fileName}`);
    }

    /**
     * List packages in storage
     */
    async listStoredPackages(): Promise<string[]> {
        const result = await this.storage.list({
            prefix: 'packages/',
            maxResults: PACKAGE_LIST_LIMIT,
        });

        return result.files.map(f => f.path);
    }

    /**
     * Get package metadata from storage
     */
    async getPackageMetadata(packageId: string): Promise<object | null> {
        const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
        if (!pkg) return null;

        const fileName = this.getStorageFileName(pkg);
        const info = await this.storage.getMetadata(fileName);

        return {
            size: info.size,
            contentType: info.contentType,
            md5Hash: info.md5Hash,
            updated: info.lastModified?.toISOString(),
            customMetadata: info.metadata,
        };
    }

    /**
     * Sync package metadata with database
     * Updates size and hash from actual stored files
     */
    async syncMetadata(): Promise<number> {
        const packages = await this.packageRepo.find();
        let updated = 0;

        for (const pkg of packages) {
            try {
                const metadata = await this.getPackageMetadata(pkg.id);
                if (metadata) {
                    await this.packageRepo.update(pkg.id, {
                        fileSize: (metadata as { size: number }).size,
                    });
                    updated++;
                }
            } catch (err) {
                this.logger.warn(`Failed to sync metadata for ${pkg.id}: ${err}`);
            }
        }

        return updated;
    }

    /**
     * Generate storage file name from package
     */
    private getStorageFileName(pkg: MapPackage): string {
        const extension = pkg.type === 'style' ? 'json' : pkg.type;
        return `packages/${pkg.id}.${extension}`;
    }
}
