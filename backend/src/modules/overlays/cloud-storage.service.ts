/**
 * Cloud Storage integration for Map Package distribution
 * Uses Google Cloud Storage (GCS) for hosting offline map packages
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { MapPackage } from './entities/map-package.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasErrorCode } from '../../common/utils/error-utils';

@Injectable()
export class CloudStorageService {
    private readonly logger = new Logger(CloudStorageService.name);
    private storage: Storage | null = null;
    private bucketName: string;

    constructor(
        private configService: ConfigService,
        @InjectRepository(MapPackage)
        private packageRepo: Repository<MapPackage>,
    ) {
        this.bucketName = this.configService.get<string>('GCS_MAP_PACKAGES_BUCKET', 'lightkeepers-map-packages');

        // Initialize GCS client if credentials are available
        const projectId = this.configService.get<string>('GCP_PROJECT_ID');
        if (projectId) {
            this.storage = new Storage({ projectId });
            this.logger.log(`Cloud Storage initialized for bucket: ${this.bucketName}`);
        } else {
            this.logger.warn('GCP_PROJECT_ID not set, cloud storage features disabled');
        }
    }

    /**
     * Check if cloud storage is available
     */
    isAvailable(): boolean {
        return this.storage !== null;
    }

    /**
     * Generate a signed URL for downloading a package
     * Valid for 1 hour
     */
    async getSignedDownloadUrl(packageId: string): Promise<string | null> {
        if (!this.storage) return null;

        const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
        if (!pkg) {
            throw new Error(`Package not found: ${packageId}`);
        }

        const fileName = this.getStorageFileName(pkg);
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(fileName);

        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            this.logger.warn(`Package file not found in storage: ${fileName}`);
            return null;
        }

        // Generate signed URL
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });

        return signedUrl;
    }

    /**
     * Upload a package to cloud storage
     */
    async uploadPackage(
        packageId: string,
        buffer: Buffer,
        contentType: string = 'application/octet-stream'
    ): Promise<{ url: string; size: number }> {
        if (!this.storage) {
            throw new Error('Cloud storage not configured');
        }

        const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
        if (!pkg) {
            throw new Error(`Package not found: ${packageId}`);
        }

        const fileName = this.getStorageFileName(pkg);
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(fileName);

        await file.save(buffer, {
            contentType,
            metadata: {
                packageId: pkg.id,
                version: pkg.version,
                type: pkg.type,
            },
        });

        // Update package record with storage URL
        const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
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
     * Delete a package from cloud storage
     */
    async deletePackage(packageId: string): Promise<void> {
        if (!this.storage) return;

        const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
        if (!pkg) return;

        const fileName = this.getStorageFileName(pkg);
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(fileName);

        try {
            await file.delete();
            this.logger.log(`Deleted package file: ${fileName}`);
        } catch (err: unknown) {
            if (!hasErrorCode(err, '404')) {
                throw err;
            }
        }
    }

    /**
     * List packages in cloud storage
     */
    async listStoredPackages(): Promise<string[]> {
        if (!this.storage) return [];

        const bucket = this.storage.bucket(this.bucketName);
        const [files] = await bucket.getFiles({ prefix: 'packages/' });

        return files.map(f => f.name);
    }

    /**
     * Get package metadata from storage
     */
    async getPackageMetadata(packageId: string): Promise<object | null> {
        if (!this.storage) return null;

        const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
        if (!pkg) return null;

        const fileName = this.getStorageFileName(pkg);
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(fileName);

        const [metadata] = await file.getMetadata();
        return {
            size: metadata.size,
            contentType: metadata.contentType,
            md5Hash: metadata.md5Hash,
            updated: metadata.updated,
            customMetadata: metadata.metadata,
        };
    }

    /**
     * Sync package metadata with database
     * Updates size and hash from actual stored files
     */
    async syncMetadata(): Promise<number> {
        if (!this.storage) return 0;

        const packages = await this.packageRepo.find();
        let updated = 0;

        for (const pkg of packages) {
            try {
                const metadata = await this.getPackageMetadata(pkg.id);
                if (metadata) {
                    await this.packageRepo.update(pkg.id, {
                        fileSize: (metadata as any).size,
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
