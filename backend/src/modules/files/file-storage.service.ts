/**
 * File Storage Service
 * Centralized file management
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredFile {
    id: string;
    originalName: string;
    filename: string;
    mimeType: string;
    size: number;
    path: string;
    url: string;
    uploadedBy?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

export interface UploadOptions {
    folder?: string;
    allowedTypes?: string[];
    maxSize?: number; // in bytes
    generateThumbnail?: boolean;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Injectable()
export class FileStorageService {
    private readonly logger = new Logger(FileStorageService.name);
    private readonly uploadDir: string;
    private readonly baseUrl: string;

    constructor(private configService: ConfigService) {
        this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
        this.baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
        this.ensureUploadDir();
    }

    // ==================== File Operations ====================

    /**
     * Save a file from buffer
     */
    async saveFile(
        buffer: Buffer,
        originalName: string,
        mimeType: string,
        uploadedBy?: string,
        options: UploadOptions = {}
    ): Promise<StoredFile> {
        // Validate
        const maxSize = options.maxSize || DEFAULT_MAX_SIZE;
        const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;

        if (buffer.length > maxSize) {
            throw new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
        }

        if (!allowedTypes.includes(mimeType)) {
            throw new Error(`File type not allowed: ${mimeType}`);
        }

        // Generate unique filename
        const ext = path.extname(originalName);
        const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 8);
        const timestamp = Date.now();
        const filename = `${timestamp}-${hash}${ext}`;

        // Determine folder
        const folder = options.folder || this.getDateFolder();
        const targetDir = path.join(this.uploadDir, folder);
        this.ensureDir(targetDir);

        // Save file
        const filePath = path.join(targetDir, filename);
        fs.writeFileSync(filePath, buffer);

        const storedFile: StoredFile = {
            id: `file-${timestamp}-${hash}`,
            originalName,
            filename,
            mimeType,
            size: buffer.length,
            path: path.join(folder, filename),
            url: `${this.baseUrl}/uploads/${folder}/${filename}`,
            uploadedBy,
            createdAt: new Date(),
        };

        this.logger.log(`File saved: ${storedFile.path}`);
        return storedFile;
    }

    /**
     * Get file by path
     */
    getFile(filePath: string): Buffer | null {
        const fullPath = path.join(this.uploadDir, filePath);

        if (!fs.existsSync(fullPath)) {
            return null;
        }

        return fs.readFileSync(fullPath);
    }

    /**
     * Delete a file
     */
    deleteFile(filePath: string): boolean {
        const fullPath = path.join(this.uploadDir, filePath);

        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                this.logger.log(`File deleted: ${filePath}`);
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to delete file: ${filePath}`, error);
            return false;
        }
    }

    /**
     * List files in a folder
     */
    listFiles(folder: string): string[] {
        const targetDir = path.join(this.uploadDir, folder);

        if (!fs.existsSync(targetDir)) {
            return [];
        }

        return fs.readdirSync(targetDir).filter(f => {
            const stat = fs.statSync(path.join(targetDir, f));
            return stat.isFile();
        });
    }

    /**
     * Get storage statistics
     */
    getStorageStats(): { totalFiles: number; totalSize: number; folders: string[] } {
        let totalFiles = 0;
        let totalSize = 0;
        const folders: string[] = [];

        const walkDir = (dir: string) => {
            if (!fs.existsSync(dir)) return;

            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    folders.push(path.relative(this.uploadDir, fullPath));
                    walkDir(fullPath);
                } else {
                    totalFiles++;
                    totalSize += stat.size;
                }
            }
        };

        walkDir(this.uploadDir);

        return { totalFiles, totalSize, folders };
    }

    /**
     * Clean old files
     */
    async cleanOldFiles(daysOld = 30): Promise<number> {
        const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
        let deleted = 0;

        const walkDir = (dir: string) => {
            if (!fs.existsSync(dir)) return;

            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    walkDir(fullPath);
                } else if (stat.mtimeMs < cutoff) {
                    fs.unlinkSync(fullPath);
                    deleted++;
                }
            }
        };

        walkDir(this.uploadDir);
        this.logger.log(`Cleaned ${deleted} old files`);

        return deleted;
    }

    // ==================== Helpers ====================

    private getDateFolder(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}/${month}`;
    }

    private ensureUploadDir(): void {
        this.ensureDir(this.uploadDir);
    }

    private ensureDir(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}
