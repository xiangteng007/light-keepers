/**
 * File Integrity Service
 * 檔案完整性驗證服務
 * 
 * 使用 SHA-256 雜湊驗證上傳檔案的完整性
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface FileHashResult {
    hash: string;
    algorithm: string;
    verified: boolean;
    filePath?: string;
    error?: string;
}

export interface StoredFileInfo {
    originalName: string;
    storagePath: string;
    mimeType: string;
    size: number;
    hash: string;
    uploadedAt: Date;
    uploadedBy: string;
}

@Injectable()
export class FileIntegrityService {
    private readonly logger = new Logger(FileIntegrityService.name);
    private readonly algorithm = 'sha256';

    /**
     * 計算檔案的 SHA-256 雜湊
     */
    async calculateHash(filePath: string): Promise<FileHashResult> {
        return new Promise((resolve) => {
            try {
                const hash = crypto.createHash(this.algorithm);
                const stream = fs.createReadStream(filePath);

                stream.on('data', (data) => hash.update(data));
                stream.on('end', () => {
                    const digest = hash.digest('hex');
                    this.logger.debug(`Hash calculated for ${filePath}: ${digest.substring(0, 16)}...`);
                    resolve({
                        hash: digest,
                        algorithm: this.algorithm,
                        verified: true,
                        filePath,
                    });
                });
                stream.on('error', (err) => {
                    this.logger.error(`Hash calculation failed: ${err.message}`);
                    resolve({
                        hash: '',
                        algorithm: this.algorithm,
                        verified: false,
                        filePath,
                        error: err.message,
                    });
                });
            } catch (err: any) {
                resolve({
                    hash: '',
                    algorithm: this.algorithm,
                    verified: false,
                    filePath,
                    error: err.message,
                });
            }
        });
    }

    /**
     * 計算 Buffer 的 SHA-256 雜湊
     */
    calculateHashFromBuffer(buffer: Buffer): string {
        return crypto.createHash(this.algorithm).update(buffer).digest('hex');
    }

    /**
     * 計算 Stream 的 SHA-256 雜湊
     */
    async calculateHashFromStream(stream: NodeJS.ReadableStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash(this.algorithm);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * 驗證檔案雜湊
     */
    async verifyHash(filePath: string, expectedHash: string): Promise<boolean> {
        const result = await this.calculateHash(filePath);
        if (!result.verified) {
            this.logger.warn(`Hash verification failed for ${filePath}: ${result.error}`);
            return false;
        }

        const match = result.hash === expectedHash.toLowerCase();
        if (!match) {
            this.logger.warn(`Hash mismatch for ${filePath}`);
            this.logger.warn(`  Expected: ${expectedHash}`);
            this.logger.warn(`  Actual:   ${result.hash}`);
        }
        return match;
    }

    /**
     * 驗證 Buffer 雜湊
     */
    verifyHashFromBuffer(buffer: Buffer, expectedHash: string): boolean {
        const actualHash = this.calculateHashFromBuffer(buffer);
        return actualHash === expectedHash.toLowerCase();
    }

    /**
     * 生成唯一檔案名稱 (基於雜湊)
     */
    generateHashedFilename(originalName: string, buffer: Buffer): string {
        const hash = this.calculateHashFromBuffer(buffer);
        const ext = path.extname(originalName);
        // 使用前 16 字元作為檔名
        return `${hash.substring(0, 16)}${ext}`;
    }

    /**
     * 建立檔案資訊記錄
     */
    createFileInfo(
        originalName: string,
        storagePath: string,
        mimeType: string,
        size: number,
        hash: string,
        uploadedBy: string,
    ): StoredFileInfo {
        return {
            originalName,
            storagePath,
            mimeType,
            size,
            hash,
            uploadedAt: new Date(),
            uploadedBy,
        };
    }

    /**
     * 批次驗證檔案
     */
    async verifyMultiple(
        files: Array<{ path: string; expectedHash: string }>,
    ): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();

        await Promise.all(
            files.map(async ({ path: filePath, expectedHash }) => {
                const isValid = await this.verifyHash(filePath, expectedHash);
                results.set(filePath, isValid);
            }),
        );

        const validCount = Array.from(results.values()).filter(Boolean).length;
        this.logger.log(`Batch verification: ${validCount}/${files.length} files valid`);

        return results;
    }
}
